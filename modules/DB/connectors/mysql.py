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
        self._db = None

    def connect(self):
        creds = self._config.get_config_data("mysql_creds")
        if creds is None:
            self._logger.error("Mysql creds for connection unfilled or incorrect!")
            sys.exit()

        try:
            self._db = pymysql.connect(
                host=creds["host"],
                user=creds["login"],
                password=creds["password"],
                database=creds["database"],
                cursorclass=pymysql.cursors.DictCursor
            )
        except pymysql.err.OperationalError as e:
            if e.args[0] == 1049:  # DB schema not found, try to create it
                self._create_schema(creds)
            else:
                self._logger.error(f"Connection error: {e}")
                sys.exit()
        except KeyError as e:
            self._logger.error(f"Mysql '{e.args[0]}' key unfilled or incorrect!")
            sys.exit()

    def _create_schema(self, creds):
        try:
            self._db = pymysql.connect(
                host=creds["host"],
                user=creds["login"],
                password=creds["password"],
                cursorclass=pymysql.cursors.DictCursor
            )
            self._init_db()
        except pymysql.err.OperationalError as e:
            self._logger.error(f"Failed to create schema: {e}")
            sys.exit()

    def _init_db(self):
        try:
            with self._db.cursor() as cursor:
                cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {os.getenv('MYSQL_DATABASE')}")
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        user_id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(50),
                        pwd_hash VARCHAR(100),
                        access_token VARCHAR(100),
                        full_name VARCHAR(100),
                        ip_address VARCHAR(16),
                        best_vpn_countries JSON,
                        best_vpn_address JSON,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
            self._db.commit()
        except pymysql.err.OperationalError as e:
            self._logger.error(f"Error while creating DB: {e}")
            sys.exit()

    def db_read(self, query: str, params: Optional[tuple] = ()) -> Optional[list]:
        self.connect()
        try:
            with self._db.cursor() as cursor:
                cursor.execute(query, params)
                data = cursor.fetchall()
            return data
        except Exception as e:
            self._logger.error(f"Error while executing query: {query} - {e}")
            return None
        finally:
            self._db.close()

    def db_write(self, query: str, params: Optional[tuple] = ()) -> bool:
        self.connect()
        try:
            with self._db.cursor() as cursor:
                cursor.execute(query, params)
            self._db.commit()
            return True
        except Exception as e:
            self._logger.error(f"Error while executing query: {query} - {e}")
            return False
        finally:
            self._db.close()
