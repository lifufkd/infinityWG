#####################################
#            Created by             #
#               sbr                 #
#####################################
import os
import sqlite3
from threading import Lock
#####################################


class Sqlite3:
    def __init__(self, path):
        super(Sqlite3, self).__init__()
        self.__db_path = path
        self.__lock = Lock()
        self.__cursor = None
        self.__db = None
        self.init()

    def init(self):
        if not os.path.exists(self.__db_path):
            self.__db = sqlite3.connect(self.__db_path, check_same_thread=False)
            self.__cursor = self.__db.cursor()
            self.__cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER AUTO_INCREMENT PRIMARY KEY,
                    username TEXT NOT NULL,
                    pwd_hash TEXT NOT NULL,
                    access_token TEXT NOT NULL,
                    full_name TEXT,
                    preferred_country TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            self.__db.commit()
        else:
            self.__db = sqlite3.connect(self.__db_path, check_same_thread=False)
            self.__cursor = self.__db.cursor()

    def db_write(self, queri, args):
        self.set_lock()
        self.__cursor.execute(queri, args)
        self.__db.commit()
        self.realise_lock()

    def db_read(self, queri, args):
        self.set_lock()
        self.__cursor.execute(queri, args)
        self.realise_lock()
        return self.__cursor.fetchall()

    def set_lock(self):
        self.__lock.acquire(True)

    def realise_lock(self):
        self.__lock.release()