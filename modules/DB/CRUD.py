##########################
#       Created By       #
#          SBR           #
##########################
from modules.DB.connectors.mysql import MySql
from modules.DB.connectors.sqlite import Sqlite3
from typing import Optional
from modules.Utilities import replace_args_for_db
from typing import Annotated
##########################
config_path = 'config.json'
##########################


class CRUD:
    def __init__(self, db: MySql | Sqlite3):
        super(CRUD, self).__init__()
        self.__db = db

    def add_user(self, username: str, password_hash: str, full_name: str | None = None):
        query = "INSERT INTO `users` (`username`, `pwd_hash`, `full_name`) VALUES(%s, %s, %s)"
        status = self.__db.db_write(replace_args_for_db(self.__db, query),
                           (username, password_hash, full_name))
        return status

    def get_user_server(self, row_id: int):
        query = "SELECT `best_vpn_address` FROM `users` WHERE `user_id` = %s"
        data = self.__db.db_read(replace_args_for_db(self.__db, query), (row_id, ))
        if len(data) > 0:
            return data[0][0]
        else:
            return None

    def get_user_server_by_country(self, row_id: int):
        query = "SELECT `best_vpn_countries` FROM `users` WHERE `user_id` = %s"
        data = self.__db.db_read(replace_args_for_db(self.__db, query), (row_id, ))
        if len(data) > 0:
            return data[0][0]
        else:
            return None

    def get_users_logins(self) -> Optional[list]:
        data = list()
        users = self.__db.db_read('SELECT `username` FROM users')
        if users:
            for user in users:
                data.append(user.values())
        return data

