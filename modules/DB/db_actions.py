##########################
#       Created By       #
#          SBR           #
##########################
from modules.logger import Logger
from modules.config import Config
from modules.DB.connectors.mysql import MySql
##########################
config_path = 'config.json'
##########################


class CRUD:
    def __init__(self, db):
        super(CRUD, self).__init__()
        self.__db = db

    def add_user(self, username: str, password: str, full_name: str):
        pass

    def get_user_server(self, row_id):
        data = self.__db.db_read("SELECT `best_vpn_address` FROM `users` WHERE row_id = %s", (row_id, ))
        if len(data) > 0:
            return data[0][0]
        else:
            return None

    def get_user_server_by_country(self, row_id):
        data = self.__db.db_read("SELECT `best_vpn_countries` FROM `users` WHERE row_id = %s", (row_id, ))
        if len(data) > 0:
            return data[0][0]
        else:
            return None