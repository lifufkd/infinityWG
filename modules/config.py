##########################
#       Created By       #
#          SBR           #
##########################
import os
import json
import sys
import random
import string
##########################

##########################


class Config:
    def __init__(self, config_path):
        super(Config, self).__init__()
        self.__config_path = config_path
        self.config_data = None
        self.__default_config_data = {
            "version": "release",
            "DB": "sqlite3",
            "sqlite3_db_path": "db.sqlite3",
            "mysql_creds": {
                "host": "localhost",
                "login": "***",
                "password": "***",
                "database": "InfinityWG"
            },
            "user": {
                "min_login_length": 8,
                "min_password_length": 8
            },
            "access_token": {
                "expire_minutes": 15,
                "algorithm": "HS256",
                "server_secret_key": ""
            },
            "2captcha_apiKey": "***"
        }
        self.load_config()

    @staticmethod
    def generate_random_string(length: int = 64) -> str:
        return ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(length))

    def load_config(self):
        if os.path.exists(self.__config_path):
            with open(self.__config_path, 'r') as config:
                self.config_data = json.loads(config.read())
        else:
            self.__default_config_data["access_token"]["server_secret_key"] = self.generate_random_string(64)
            self.config_data = self.__default_config_data
            self.save_config()
            sys.exit("Config file not found")

    def save_config(self):
        with open(self.__config_path, 'w') as config:
            config.write(json.dumps(self.config_data, indent=4))

    def get_config_data(self, key):
        if key in self.config_data.keys():
            return self.config_data[key]
        else:
            return None

    def set_config_data(self, key, value):
        try:
            self.config_data[key] = value
            self.save_config()
            return True
        except:
            return None

    def delete_config_data(self, key):
        if key in self.config_data.keys():
            del self.config_data[key]
            self.save_config()
            return True
        else:
            return None