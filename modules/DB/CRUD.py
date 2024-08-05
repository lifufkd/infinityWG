##########################
#       Created By       #
#          SBR           #
##########################
import json
from datetime import datetime

from modules.DB.connectors.mysql import MySql
from modules.DB.connectors.sqlite import Sqlite3
from typing import Optional
from modules.utilities import replace_args_for_db
##########################
config_path = 'config.json'
##########################


class CRUD:
    def __init__(self, db: MySql | Sqlite3):
        super(CRUD, self).__init__()
        self.__db = db

    async def add_user(self, username: str, password_hash: str, full_name: str | None = None):
        query = "INSERT INTO `users` (`username`, `pwd_hash`, `full_name`) VALUES(%s, %s, %s)"
        status = await self.__db.db_write(replace_args_for_db(self.__db, query),
                                         (username, password_hash, full_name))
        return status

    async def get_user_hash(self, username: str) -> Optional[str] | bool:
        query = "SELECT `pwd_hash` FROM `users` WHERE `username` = %s"
        data = await self.__db.db_read(replace_args_for_db(self.__db, query), (username, ))
        if data:
            return data[0]["pwd_hash"]
        else:
            return False

    async def user_is_exists(self, username: str) -> bool:
        query = "SELECT COUNT(*) FROM `users` WHERE `username` = %s"
        data = await self.__db.db_read(replace_args_for_db(self.__db, query), (username, ))
        if data:
            if data[0]["COUNT(*)"] == 1:
                return True
        return False

    async def get_user_id(self, username: str) -> int | None:
        query = "SELECT `user_id` FROM `users` WHERE `username` = %s"
        data = await self.__db.db_read(replace_args_for_db(self.__db, query), (username, ))
        if not data:
            return False
        return data[0]["user_id"]

    async def get_user_server_by_country(self, row_id: int | None):
        query = "SELECT `best_vpn_countries` FROM `users` WHERE `user_id` = %s"
        data = await self.__db.db_read(replace_args_for_db(self.__db, query), (row_id, ))
        if not data:
            return False
        return data[0]["best_vpn_countries"]

    async def get_users_logins(self) -> Optional[list]:
        data = list()
        users = await self.__db.db_read('SELECT `username` FROM users')
        if users:
            for user in users:
                data.append(user["username"])
        return data

    async def get_user_server(self, row_id: int | None):
        query = "SELECT `best_vpn_address` FROM `users` WHERE `user_id` = %s"
        data = await self.__db.db_read(replace_args_for_db(self.__db, query), (row_id, ))
        if not data:
            return False
        """
        [
            fr1.vpnjantit.com
        ]
        """
        return data[0]["best_vpn_address"]

    async def get_user_ip(self, user_id: int) -> str | bool:
        query = "SELECT `ip_address` FROM `users` WHERE `user_id` = %s"
        data = await self.__db.db_read(replace_args_for_db(self.__db, query), (user_id,))
        if not data:
            return False
        return data[0]["ip_address"]

    async def update_user_ip(self, user_id: int, ip: str | None = None):
        if ip == await self.get_user_ip(user_id):
            return True
        query = "UPDATE `users` SET `ip_address` = %s WHERE `user_id` = %s"
        status = await self.__db.db_write(replace_args_for_db(self.__db, query),
                                    (ip, user_id))
        return status

    async def update_user_best_vpn_address(self, user_id: int, host: list[str] | None = None):
        query = "UPDATE `users` SET `best_vpn_address` = %s WHERE `user_id` = %s"
        status = await self.__db.db_write(replace_args_for_db(self.__db, query),
                                         (json.dumps(host), user_id))
        return status

    async def update_user_best_vpn_countries(self, user_id: int, countries: dict | None = None):
        query = "UPDATE `users` SET `best_vpn_countries` = %s WHERE `user_id` = %s"
        status = await self.__db.db_write(replace_args_for_db(self.__db, query),
                                         (json.dumps(countries), user_id))
        return status

    async def add_config_request(self, user_id: int, country: str, provider: str, protocol: str) -> bool | int:
        query = ("INSERT INTO `history` (`user_id`, `country`, `provider`, `protocol`, `status`) "
                 "VALUES(%s, %s, %s, %s, %s)")
        status = await self.__db.db_write(replace_args_for_db(self.__db, query),
                                    (user_id, country, provider, protocol, False))
        return status

    async def update_config_request(self, request_id: int, config: str) -> bool:
        query = "UPDATE `history` SET `config` = %s, `end_at` = %s, `status` = %s WHERE `request_id` = %s"
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        status = await self.__db.db_write(replace_args_for_db(self.__db, query),
                                    (config, current_time, True, request_id))
        return status

    async def get_config(self, request_id: int, user_id: int) -> bool | str:
        query = "SELECT `config` FROM `history` WHERE `request_id` = %s AND `status` = %s AND `user_id` = %s"
        data = await self.__db.db_read(replace_args_for_db(self.__db, query), (request_id, True, user_id))
        if not data:
            return False
        return data[0]["config"]

