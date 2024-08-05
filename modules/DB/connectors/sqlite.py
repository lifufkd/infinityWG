#####################################
#            Created by             #
#               sbr                 #
#####################################
import os
import sys
import aiosqlite
from modules.logger import Logger
from modules.config import Config
from typing import Optional
#####################################


class Sqlite3:
    def __init__(self, config: Config = None, logger: Logger = None):
        super(Sqlite3, self).__init__()
        self.__db_path = None
        self.__config = config
        self.__logger = logger
        self.type = 'sqlite3'

    async def init(self):
        self.__db_path = self.__config.get_config_data("sqlite3_db_path")
        if self.__db_path is None:
            self.__logger.error("Path to Sqlite3 DB unfilled or incorrect!")
            sys.exit()
        async with aiosqlite.connect(self.__db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.cursor()
            await cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    pwd_hash TEXT NOT NULL,
                    full_name TEXT,
                    ip_address TEXT,
                    best_vpn_countries TEXT,
                    best_vpn_address TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS history (
                    request_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INT,
                    country VARCHAR(100),
                    config TEXT,
                    provider VARCHAR(100),
                    protocol VARCHAR(100),
                    status BOOL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    end_at TIMESTAMP
                )
            """)
            await db.commit()
            await db.close()

    async def db_write(self, query: str, args: Optional[tuple] = ()) -> Optional[bool]:
        status = bool
        await self.init()
        try:
            async with aiosqlite.connect(self.__db_path) as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.cursor()
                await cursor.execute(query, args)
                status = cursor.lastrowid
                await db.commit()
        except Exception as e:
            self.__logger.error(f"Error while executing query: {query} - {e}")
            status = None
        finally:
            await db.close()
            return status

    async def db_read(self, query: str, args: Optional[tuple] = ()) -> Optional[list[dict]] | bool:
        status = bool
        results = list()
        await self.init()
        try:
            async with aiosqlite.connect(self.__db_path) as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.cursor()
                await cursor.execute(query, args)
                results = await cursor.fetchall()
                status = True
        except Exception as e:
            self.__logger.error(f"Error while executing query: {query} - {e}")
            status = False
        finally:
            await db.close()
            if not status:
                return False
            return [dict(row) for row in results]