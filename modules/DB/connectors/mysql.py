##########################
#       Created By       #
#          SBR           #
##########################
import sys
import pymysql.cursors
import os
from dotenv import load_dotenv
##########################

##########################


class MySql:
    def __init__(self, logger):
        super(MySql, self).__init__()
        self.__logger = logger
        self.__db = None
        load_dotenv()
        self.connect()
        self.init()

    def connect(self):
        try:
            self.__db = pymysql.connect(host=os.getenv('MYSQL_HOST'),
                                        user=os.getenv('MYSQL_LOGIN'),
                                        password=os.getenv('MYSQL_PASSWORD'),
                                        database=os.getenv('MYSQL_DATABASE'),
                                        cursorclass=pymysql.cursors.DictCursor)
        except pymysql.err.OperationalError as e:
            if e.args[0] == 1049:
                self.__db = pymysql.connect(host=os.getenv('MYSQL_HOST'),
                                            user=os.getenv('MYSQL_LOGIN'),
                                            password=os.getenv('MYSQL_PASSWORD'),
                                            cursorclass=pymysql.cursors.DictCursor)

    def init(self):
        try:
            with self.__db.cursor() as cursor:
                cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {os.getenv('MYSQL_DATABASE')}")
                cursor.execute(f"""
                                    CREATE TABLE IF NOT EXISTS users (
                                        user_id INT AUTO_INCREMENT PRIMARY KEY,
                                        username VARCHAR(50) NOT NULL,
                                        pwd_hash VARCHAR(100) NOT NULL,
                                        access_token VARCHAR(100) NOT NULL,
                                        full_name VARCHAR(100),
                                        preferred_country VARCHAR(100),
                                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                                    )
                                    """)
            self.__db.commit()
        except:
            self.__logger.logger.error(f"Error while creating DB")
        finally:
            self.__db.close()

    def db_read(self, query, params=()):
        try:
            self.connect()
            with self.__db.cursor() as cursor:
                data = cursor.execute(query, params)
            self.__db.close()
            return data
        except:
            self.__logger.logger.error(f"Error while executing query: {query}")
            return None

    def db_write(self, query, params=()):
        try:
            self.connect()
            with self.__db.cursor() as cursor:
                cursor.execute(query, params)
            self.__db.commit()
            return True
        except:
            self.__logger.logger.error(f"Error while executing query: {query}", exc_info=True)
            return None
