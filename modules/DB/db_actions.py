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