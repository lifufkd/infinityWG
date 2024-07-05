##########################
#       Created By       #
#          SBR           #
##########################
import json
import time
import sys
import random
from seleniumbase import Driver
from datetime import datetime
from selenium.webdriver.common.by import By
from modules.DB.connectors.mysql import MySql
from modules.DB.db_actions import CRUD
from modules.config import Config
from modules.logger import Logger
##########################

##########################


class VpnJantit:
    def __init__(self, db_connector: MySql = None, config: Config = None, logger: Logger = None, version: str = 'realise'):
        super(VpnJantit, self).__init__()
        self.__version = version
        self.__config = config
        self.__logger = logger
        self.__driver = None
        self.__CRUD = CRUD(db_connector)
        self.init()

    def init(self):
        if self.__version == 'realise':
            self.__driver = Driver(uc=True, no_sandbox=True, uc_cdp=True,
                                   uc_cdp_events=True, extension_dir='./src/selenium/adblock', headless2=True, headed=False, agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')
            time.sleep(20)
            self.close_tab_by_domain('welcome.adblockplus.org')
        elif self.__version == 'debug':
            self.__driver = Driver(uc=True, no_sandbox=True, uc_cdp=True,
                                   uc_cdp_events=True)
        else:
            sys.exit('Wrong version specified!')
        self.main()

    def check_config_key_existed(self, key):
        value = self.__config.get_config_data("vpnjantit_home_page")
        if value is not None:
            return value
        else:
            self.__logger.logger.error(f"{key} parameter unfilled!")
            sys.exit()

    def main(self) -> True or False:
        self.__driver.get(self.check_config_key_existed("vpnjantit_home_page"))
        time.sleep(50000)

    def close_tab_by_domain(self, domain_name):
        original_window = self.__driver.current_window_handle
        all_windows = self.__driver.window_handles
        for window in all_windows:
            self.__driver.switch_to.window(window)
            current_url = self.__driver.current_url
            if domain_name in current_url:
                self.__driver.close()
                break
        self.__driver.switch_to.window(original_window)

    def __del__(self):
        if self.__driver is not None:
            self.__driver.quit()

