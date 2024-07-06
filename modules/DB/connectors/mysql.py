##########################
#       Created By       #
#          SBR           #
##########################
import os
import sys
import pymysql.cursors
from modules.logger import Logger
from modules.config import Config
##########################

##########################


class MySql:
    def __init__(self, config: Config = None, logger: Logger = None):
        super(MySql, self).__init__()
        self.__config = config
        self.__logger = logger
        self.__db = None
        self.connect()
        self.init()

    def connect(self):
        creds = self.__config.get_config_data("mysql_creds")
        if creds is None:
            self.__logger.logger.error("Mysql creds for connection unfilled or incorrect!")
            sys.exit()
        try:
            self.__db = pymysql.connect(host=creds["host"],
                                        user=creds["login"],
                                        password=creds["password"],
                                        database=creds["database"],
                                        cursorclass=pymysql.cursors.DictCursor)
        except pymysql.err.OperationalError as e:
            # DB schema not found, try to create it
            if e.args[0] == 1049:
                self.__db = pymysql.connect(host=creds["host"],
                                            user=creds["login"],
                                            password=creds["password"],
                                            cursorclass=pymysql.cursors.DictCursor)
            else:
                self.__logger.logger.error(f"Connection error!")
                sys.exit()
        except KeyError as e:
            self.__logger.logger.error(f"Mysql '{e.args[0]}' key unfilled or incorrect!")
            sys.exit()

    def init(self):
        try:
            with self.__db.cursor() as cursor:
                cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {os.getenv('MYSQL_DATABASE')}")
                cursor.execute(f"""
                    CREATE TABLE IF NOT EXISTS users (
                        user_id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(50),
                        pwd_hash VARCHAR(100),
                        access_token VARCHAR(100),
                        full_name VARCHAR(100),
                        ip_address VARCHAR(16),
                        best_vpn_country_ips JSON,
                        best_vpn_ip VARCHAR(16),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
            self.__db.commit()
        except pymysql.err.OperationalError:
            self.__logger.logger.error(f"Error while creating DB")
            sys.exit()
        self.__db.close()

    def db_read(self, query, params=()):
        try:
            self.connect()
            with self.__db.cursor() as cursor:
                data = cursor.execute(query, params)
            self.__db.close()
            return data
        except:
            self.__logger.logger.error(f"Error while executing query: {query}", exc_info=True)
            return None

    def db_write(self, query, params=()):
        try:
            self.connect()
            with self.__db.cursor() as cursor:
                cursor.execute(query, params)
            self.__db.commit()
            self.__db.close()
            return True
        except:
            self.__logger.logger.error(f"Error while executing query: {query}", exc_info=True)
            return None
