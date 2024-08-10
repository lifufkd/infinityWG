##########################
#       Created By       #
#          SBR           #
##########################
import sys
import aiomysql
from typing import Optional
from modules.logger import Logger
from modules.config import Config
##########################

##########################


class MySql:
    def __init__(self, config: 'Config', logger: 'Logger'):
        self._config = config
        self._logger = logger
        self.type = 'mysql'
        self._db = None

    async def init(self):
        creds = self._config.get_config_data("mysql_creds")
        if creds is None:
            self._logger.error("Mysql creds for connection unfilled or incorrect!")
            sys.exit()

        try:
            await self._connect_db(creds)
        except aiomysql.OperationalError as e:
            if e.args[0] == 1049:  # DB schema not found, try to create it
                await self._create_db(creds)
            else:
                self._logger.error(f"Connection error: {e}")
                sys.exit()
        except KeyError as e:
            self._logger.error(f"Mysql '{e.args[0]}' key unfilled or incorrect!")
            sys.exit()

    async def _connect_db(self, creds: dict) -> None:
        self._db = await aiomysql.connect(
                host=creds["host"],
                user=creds["login"],
                password=creds["password"],
                db=creds["database"],
                cursorclass=aiomysql.cursors.DictCursor
            )

    async def _create_db(self, creds):
        try:
            self._db = await aiomysql.connect(
                host=creds["host"],
                user=creds["login"],
                password=creds["password"],
                cursorclass=aiomysql.cursors.DictCursor
            )
            await self._create_schema(creds)
            self._db.close()
            await self._connect_db(creds)
            await self._create_table()
        except aiomysql.OperationalError as e:
            self._logger.error(f"Failed to create schema: {e}")
            sys.exit()

    async def _create_schema(self, creds):
        async with self._db.cursor() as cursor:
            await cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {creds['database']}")
        await self._db.commit()

    async def _create_table(self):
        async with self._db.cursor() as cursor:
            await cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50),
                    pwd_hash VARCHAR(100),
                    full_name VARCHAR(100),
                    ip_address VARCHAR(16),
                    best_vpn_countries LONGTEXT,
                    best_vpn_address MEDIUMTEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await cursor.execute("""
                CREATE TABLE IF NOT EXISTS history (
                    request_id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT,
                    country VARCHAR(100),
                    config MEDIUMTEXT,
                    provider VARCHAR(100),
                    protocol VARCHAR(100),
                    status BOOL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    end_at TIMESTAMP
                )
            """)
        await self._db.commit()

    async def db_read(self, query: str, params: Optional[tuple] = ()) -> Optional[list] | bool:
        status = bool
        await self.init()
        try:
            async with self._db.cursor() as cursor:
                await cursor.execute(query, params)
                data = await cursor.fetchall()
            status = True
        except Exception as e:
            self._logger.error(f"Error while executing query: {query} - {e}")
            status = False
        finally:
            self._db.close()
            if not status:
                return False
            return data

    async def db_write(self, query: str, params: Optional[tuple] = ()) -> bool:
        status = bool
        await self.init()
        try:
            async with self._db.cursor() as cursor:
                await cursor.execute(query, params)
                status = cursor.lastrowid
            await self._db.commit()
        except Exception as e:
            self._logger.error(f"Error while executing query: {query} - {e}")
            status = None
        finally:
            self._db.close()
            return status
