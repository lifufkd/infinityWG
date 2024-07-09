#####################################
#            Created by             #
#               sbr                 #
#####################################
import os
import sys
import sqlite3
from threading import Lock
from modules.Logger import Logger
from modules.Config import Config
from typing import Optional
#####################################


class Sqlite3:
    def __init__(self, config: Config = None, logger: Logger = None):
        super(Sqlite3, self).__init__()
        self.__lock = Lock()
        self.__db_path = None
        self.__cursor = None
        self.__db = None
        self.__config = config
        self.__logger = logger
        self.type = 'sqlite3'
        self.init()

    def init(self):
        self.__db_path = self.__config.get_config_data("sqlite3_db_path")
        if self.__db_path is None:
            self.__logger.error("Path to Sqlite3 DB unfilled or incorrect!")
            sys.exit()
        if not os.path.exists(self.__db_path):
            self.__db = sqlite3.connect(self.__db_path, check_same_thread=False)
            self.__db.row_factory = sqlite3.Row
            self.__cursor = self.__db.cursor()
            self.__cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER AUTO_INCREMENT PRIMARY KEY,
                    username TEXT NOT NULL,
                    pwd_hash TEXT NOT NULL,
                    access_token TEXT,
                    full_name TEXT,
                    ip_address TEXT,
                    best_vpn_countries TEXT,
                    best_vpn_address TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            self.__db.commit()
        else:
            self.__db = sqlite3.connect(self.__db_path, check_same_thread=False)
            self.__db.row_factory = sqlite3.Row
            self.__cursor = self.__db.cursor()

    def db_write(self, query: str, args: Optional[tuple] = ()) -> Optional[bool]:
        status = bool
        self.set_lock()
        try:
            self.__cursor.execute(query, args)
            self.__db.commit()
            status = True
        except Exception as e:
            self.__logger.error(f"Error while executing query: {query} - {e}")
            status = False
        finally:
            self.realise_lock()
            return status

    def db_read(self, query: str, args: Optional[tuple] = ()) -> Optional[list[dict]] | bool:
        status = bool
        self.set_lock()
        try:
            self.__cursor.execute(query, args)
            results = self.__cursor.fetchall()
            status = True
        except Exception as e:
            self.__logger.error(f"Error while executing query: {query} - {e}")
            status = False
        finally:
            self.realise_lock()
            if not status:
                return False
            return [dict(row) for row in results]

    def set_lock(self):
        self.__lock.acquire(True)

    def realise_lock(self):
        self.__lock.release()