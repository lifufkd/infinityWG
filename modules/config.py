##########################
#       Created By       #
#          SBR           #
##########################
import os
import json
import sys
##########################

##########################


class Config:
    def __init__(self, config_path):
        super(Config, self).__init__()
        self.__config_path = config_path
        self.config_data = None
        self.__default_config_data = {
            "version": "realise",
            "DB": "sqlite3",
            "mysql_creds": {
                "host": "localhost",
                "login": "***",
                "password": "***",
                "database": "InfinityWG"
            },
            "sqlite3_db_path": "db.sqlite3",
            "vpnjantit_home_page": "https://www.vpnjantit.com/free-wireguard"
        }
        self.load_config()

    def load_config(self):
        if os.path.exists(self.__config_path):
            with open(self.__config_path, 'r') as config:
                self.config_data = json.loads(config.read())
        else:
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