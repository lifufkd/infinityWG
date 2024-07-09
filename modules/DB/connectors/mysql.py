##########################
#       Created By       #
#          SBR           #
##########################
import os
import sys
import pymysql
import pymysql.cursors
from typing import Optional
from modules.Logger import Logger
from modules.Config import Config
##########################

##########################


class MySql:
    def __init__(self, config: 'Config', logger: 'Logger'):
        self._config = config
        self._logger = logger
        self.type = 'mysql'
        self._db = None

    def init(self):
        creds = self._config.get_config_data("mysql_creds")
        if creds is None:
            self._logger.error("Mysql creds for connection unfilled or incorrect!")
            sys.exit()

        try:
            self._connect_db(creds)
        except pymysql.err.OperationalError as e:
            if e.args[0] == 1049:  # DB schema not found, try to create it
                self._create_db(creds)
            else:
                self._logger.error(f"Connection error: {e}")
                sys.exit()
        except KeyError as e:
            self._logger.error(f"Mysql '{e.args[0]}' key unfilled or incorrect!")
            sys.exit()

    def _connect_db(self, creds: dict) -> None:
        self._db = pymysql.connect(
                host=creds["host"],
                user=creds["login"],
                password=creds["password"],
                database=creds["database"],
                cursorclass=pymysql.cursors.DictCursor
            )

    def _create_db(self, creds):
        try:
            self._db = pymysql.connect(
                host=creds["host"],
                user=creds["login"],
                password=creds["password"],
                cursorclass=pymysql.cursors.DictCursor
            )
            self._create_schema(creds)
            self._db.close()
            self._connect_db(creds)
            self._create_table()
        except pymysql.err.OperationalError as e:
            self._logger.error(f"Failed to create schema: {e}")
            sys.exit()

    def _create_schema(self, creds):
        with self._db.cursor() as cursor:
            cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {creds['database']}")
        self._db.commit()

    def _create_table(self):
        with self._db.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50),
                    pwd_hash VARCHAR(100),
                    access_token VARCHAR(100),
                    full_name VARCHAR(100),
                    ip_address VARCHAR(16),
                    best_vpn_countries VARCHAR(16),
                    best_vpn_address VARCHAR(16),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
        self._db.commit()

    def db_read(self, query: str, params: Optional[tuple] = ()) -> Optional[list]:
        status = bool
        self.init()
        try:
            with self._db.cursor() as cursor:
                cursor.execute(query, params)
                data = cursor.fetchall()
            status = True
        except Exception as e:
            self._logger.error(f"Error while executing query: {query} - {e}")
            status = False
        finally:
            self._db.close()
            if not status:
                return False
            return data

    def db_write(self, query: str, params: Optional[tuple] = ()) -> bool:
        status = bool
        self.init()
        try:
            with self._db.cursor() as cursor:
                cursor.execute(query, params)
            self._db.commit()
            status = True
        except Exception as e:
            self._logger.error(f"Error while executing query: {query} - {e}")
            status = False
        finally:
            self._db.close()
            return status
