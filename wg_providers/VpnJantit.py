##########################
#       Created By       #
#          SBR           #
##########################
import json
import time
import sys
from seleniumbase import Driver
from selenium.webdriver.common.by import By
from typing import Optional
from modules.DB.connectors.mysql import MySql
from modules.DB.connectors.sqlite import Sqlite3
from modules.DB.CRUD import CRUD
from modules.CaptchaSolver import CaptchaSolver
from modules.Config import Config
from modules.Logger import Logger
from modules.Utilities import (write_json_file, read_json_file, get_best_server,
                               generate_random_string, read_config_file, exception_factory)
##########################

##########################


class VpnJantit:
    def __init__(self, db_connector: MySql | Sqlite3 | None = None, config: Config | None = None,
                 logger: Logger | None = None, country: str | None = None, server: str | None = None,
                 user_id: int | None = None, version: str = 'release'):
        super(VpnJantit, self).__init__()
        self.__version = version
        self.__config = config
        self.__logger = logger
        self._country = country
        self._server = server
        self._user_id = user_id
        self.__driver = None
        self.__CRUD = CRUD(db_connector)
        self._captcha_solver = CaptchaSolver(config, logger)
        self.init()

    def init(self):
        if self.__version == 'release':
            self.__driver = Driver(uc=True, no_sandbox=True, uc_cdp=True,
                                   uc_cdp_events=True, headless2=True, headed=False, agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')
            # time.sleep(20)
            # self.close_tab_by_domain('welcome.adblockplus.org')
        elif self.__version == 'debug':
            self.__driver = Driver(uc=True, no_sandbox=True, uc_cdp=True,
                                   uc_cdp_events=True)
        else:
            self.__logger.error("Wrong version specified!")
            sys.exit()

    def link_assembly(self) -> Optional[dict]:
        def get_link_prefix(data):
            return data[0].split('.')[0]

        if self._country is None:
            user_server = self.__CRUD.get_user_server(self._user_id)
            if user_server is None:
                return {"status": False, "link": None, "server": None, "message": "server with best connection not found", "code": 0}
            server_prefix = get_link_prefix(json.loads(user_server))
            link = f"https://www.vpnjantit.com/create-free-account?server={server_prefix}&type=WireGuard"
        else:
            user_servers = self.__CRUD.get_user_server_by_country(self._user_id)
            if user_servers is None:
                return {"status": False, "link": None, "server": None, "message": "server with best connection not found", "code": 1}
            user_servers = json.loads(user_servers)
            if self._server is None:
                server_prefix = get_link_prefix(get_best_server(user_servers, self._country))
                link = f"https://www.vpnjantit.com/create-free-account?server=" \
                       f"{server_prefix}&type=WireGuard"
            else:
                server_prefix = get_link_prefix(get_best_server(user_servers, self._country, self._server))
                link = f"https://www.vpnjantit.com/create-free-account?server=" \
                       f"{server_prefix}&type=WireGuard"
        return {"status": True, "link": link, "server": server_prefix, "message": None, "code": None}

    def refresh_server_list(self):
        # Read JSON countries file
        countries = read_json_file(self.__logger, './src/selenium/countries.json')
        for country in countries.keys():
            page_counter = 0
            while True:
                page_counter += 1
                # Open page with target vpn server
                self.__driver.get(f'https://www.vpnjantit.com/create-free-account?server={country}{page_counter}&type=WireGuard')
                time.sleep(2)
                if self.__driver.current_url == 'https://www.vpnjantit.com/': # Check for server is existed
                    del countries[country]["hosts"][page_counter-1:]
                    # Update JSON countries file
                    write_json_file(self.__logger, './src/selenium/countries.json', countries)
                    # Stop search for this country
                    break
                # Get Server domain name
                server_domain_name = self.__driver.find_element(By.CSS_SELECTOR, "input#server").get_attribute('value')
                self.__logger.info(f'Server updated - {server_domain_name}')
                if len(countries[country]["hosts"]) >= page_counter: # Checking for an index in the array
                    countries[country]["hosts"][page_counter-1] = [server_domain_name, page_counter]
                else:
                    countries[country]["hosts"].append([server_domain_name, page_counter])
                # Update JSON countries file
                write_json_file(self.__logger, './src/selenium/countries.json', countries)

    def get_config(self) -> Optional[json]:
        data = self.link_assembly()
        if data.get("status"):
            try:
                self.__driver.get(data.get("link"))
                # Generate random username
                random_login = generate_random_string(13)
                self.__driver.find_element(By.CSS_SELECTOR, "section#create > div > div > div > div > div > div > "
                                                            "form > div > input").send_keys(random_login)
                # Getting site key for solve captcha
                site_key = self.__driver.find_element(By.CLASS_NAME, "g-recaptcha").get_attribute("data-sitekey")
                # Send request to solve captcha
                response = self._captcha_solver.recaptcha_v2(
                    site_key=site_key,
                    captcha_url=data.get("link")
                )
                # Set the solved Captcha
                recaptcha_response_element = self.__driver.find_element(By.ID, 'g-recaptcha-response')
                recaptcha_response_code = response["code"]
                self.__driver.execute_script(f'arguments[0].value = "{recaptcha_response_code}";', recaptcha_response_element)
                self.__driver.find_element(By.CSS_SELECTOR, "section#create > div > div > div > div > div > div > form > "
                                                            "div:nth-of-type(2) > input").click()

                # Waiting while vpnjantit preparing config
                download_btn_selector = ("section#create > div > div > "
                                         "div:nth-of-type(3) > "
                                         "div > div > div > center > a")
                self.__driver.wait_for_element(By.CSS_SELECTOR, download_btn_selector, timeout=30)
                self.__driver.wait_for_element_visible(By.CSS_SELECTOR, download_btn_selector, timeout=30)
                self.__driver.find_element(By.CSS_SELECTOR, download_btn_selector).click()
                config_data = read_config_file(self.__logger, f"{random_login}-{data.get('server')}jantit.conf")
                if config_data is None:
                    raise exception_factory(Exception, "Config file not existed")
                data.update({"config": config_data})
                return data
            except:
                self.__logger.error("An error occurred")
                data.update({"status": False})
                data.update({"message": "An error occurred"})
                return data
        else:
            return data

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

