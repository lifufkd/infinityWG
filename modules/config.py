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
        self.__default_config_data = {}

    def load_config(self):
        if os.path.exists(self.__config_path):
            with open(self.__config_path, 'r') as config:
                self.config_data = json.loads(config.read())
        else:
            self.config_data = self.__default_config_data
            sys.exit("Config file not found")

    def save_config(self):
        with open(self.__config_path, 'w') as config:
            config.write(json.dumps(self.config_data, indent=4))

    def get_config_data(self, key):
        return self.config_data[key]

    def set_config_data(self, key, value):
        self.config_data[key] = value
        self.save_config()

    def delete_config_data(self, key):
        del self.config_data[key]
        self.save_config()