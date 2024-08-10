##########################
#       Created By       #
#          SBR           #
##########################
import json
import time
import sys
import asyncio
import threading
from seleniumbase import Driver
from selenium.webdriver.common.by import By
from typing import Optional
from modules.DB.connectors.mysql import MySql
from modules.DB.connectors.sqlite import Sqlite3
from modules.DB.CRUD import CRUD
from modules.captcha_solver import CaptchaSolver
from modules.config import Config
from modules.logger import Logger
from modules.utilities import (write_json_file, read_json_file, get_best_server,
                               generate_random_string, read_config_file, exception_factory)
##########################

##########################


class VpnJantit:
    def __init__(self, db_connector: MySql | Sqlite3 | None = None, config: Config | None = None,
                 logger: Logger | None = None, country: str | None = None, server: str | None = None,
                 user_id: int | None = None, server_quality: int = -1, version: str = 'debug'):
        super(VpnJantit, self).__init__()
        self.__version = version
        self.__config = config
        self.__logger = logger
        self._country = country
        self._server = server
        self._user_id = user_id
        self._server_quality = server_quality
        self.__driver: Driver = None
        self.__CRUD = CRUD(db_connector)
        self._captcha_solver = CaptchaSolver(config, logger)

    async def init(self):
        if self.__version == 'release':
            self.__driver = Driver(uc=True, no_sandbox=True, uc_cdp=True, extension_dir="./src/uBlockOrigin",
                                   uc_cdp_events=True, headless2=True, headed=False, agent='Mozilla/5.0 (X11;'
                                                                                           ' Linux x86_64) '
                                                                                           'AppleWebKit/537.36 '
                                                                                           '(KHTML, like Gecko) '
                                                                                           'Chrome/125.0.0.0 '
                                                                                           'Safari/537.36')
            await asyncio.sleep(10)
        elif self.__version == 'debug':
            self.__driver = Driver(uc=True, no_sandbox=True, uc_cdp=True, extension_dir="./src/uBlockOrigin",
                                   uc_cdp_events=True)
            await asyncio.sleep(10)
        else:
            self.__logger.error("Wrong version specified!")
            sys.exit()

    async def link_assembly(self) -> Optional[dict]:
        def get_link_prefix(data):
            return data[0].split('.')[0]

        async def get_user_servers():
            _user_servers = await self.__CRUD.get_user_server_by_country(self._user_id)
            if _user_servers is None:
                raise exception_factory(ValueError, "Users servers not found")
            return json.loads(_user_servers)

        try:
            if self._country is None:
                if self._server_quality == -1:
                    user_server = await self.__CRUD.get_user_server(self._user_id)
                    if user_server is None:
                        return {"status": False, "link": None, "server": None, "detail":
                            "server with best connection not found", "code": 0}
                    server_prefix = await get_link_prefix(json.loads(user_server))
                    link = f"https://www.vpnjantit.com/create-free-account?server={server_prefix}&type=WireGuard"
                else:
                    user_servers = await get_user_servers()
                    server_prefix = get_link_prefix(get_best_server(servers=user_servers,
                                                                    server_quality=self._server_quality))
                    link = f"https://www.vpnjantit.com/create-free-account?server=" \
                           f"{server_prefix}&type=WireGuard"
            else:
                user_servers = await get_user_servers()
                if self._server is None:
                    server_prefix = get_link_prefix(get_best_server(user_servers, self._country,
                                                                    server_quality=self._server_quality))
                    link = f"https://www.vpnjantit.com/create-free-account?server=" \
                           f"{server_prefix}&type=WireGuard"
                else:
                    server_prefix = get_link_prefix(get_best_server(user_servers, self._country, self._server,
                                                                    server_quality=self._server_quality))
                    link = f"https://www.vpnjantit.com/create-free-account?server=" \
                           f"{server_prefix}&type=WireGuard"

        except ValueError:
            return {"status": False, "link": None, "server": None, "detail": "server with best connection not found",
                    "code": 1}

        except Exception as e:
            self.__logger.error(f"An error occurred - {e}")
            return {"status": False, "link": None, "server": None, "detail": str(e), "code": None}

        return {"status": True, "link": link, "server": server_prefix, "detail": None, "code": None}

    async def refresh_server_list(self):
        # Read JSON countries file
        countries = await read_json_file(self.__logger, './src/selenium/countries.json')
        if not countries["status"]:
            return {"status": False, "detail": countries["detail"]}
        countries = countries["data"]
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
        return {"status": True, "detail": None}

    async def get_config(self) -> dict:
        data = await self.link_assembly()
        if not data["status"]:
            return data
        status = await self.__CRUD.add_config_request(user_id=self._user_id, country=data.get("server"), provider="VpnJantit",
                                                      protocol="WireGuard")
        if status:
            threading.Thread(target=self.run_async_function, args=(self._get_config, [status, data])).start()
            data.update({"request_id": status})
            return data
        else:
            return data

    async def _get_config(self, request_id: int, data: dict) -> Optional[json]:
        print(request_id)
        print(data)
        if data.get("status"):
            try:
                self.__driver.get(data.get("link"))

                # Try close overlapping elements if available
                close_overlaps_result = self._close_overlapping_elements()["status"]
                if not close_overlaps_result:
                    raise exception_factory(Exception, close_overlaps_result["detail"])

                # Generate random username
                random_login = generate_random_string(13)
                self.__driver.find_element(By.CSS_SELECTOR, "section#create > div > div > div > div > div > div > "
                                                            "form > div > input").send_keys(random_login)

                recaptcha_response_element = self.__driver.find_element(By.CLASS_NAME, 'cf-turnstile').find_element(By.TAG_NAME, "input")
                # Check if captcha solved automatically
                _data = recaptcha_response_element.get_attribute('value')
                if len(_data) == 0:
                    # Getting site key for solve captcha
                    site_key = self.__driver.find_element(By.CLASS_NAME, "cf-turnstile").get_attribute("data-sitekey")
                    # Send request to solve captcha
                    response = self._captcha_solver.cloudflare_turnstile(
                        sitekey=site_key,
                        captcha_url=data.get("link")
                    )
                    # Set the solved Captcha
                    recaptcha_response_code = response["code"]
                    self.__driver.execute_script("arguments[0].style.display = 'block';", recaptcha_response_element)
                    self.__driver.execute_script("arguments[0].value = arguments[1];",
                                                 recaptcha_response_element, recaptcha_response_code)
                click_button_result = self._click_element(element_type=By.CSS_SELECTOR, element_name="section#create > div > "
                                                                               "div > div > div >"
                                                                               "div > div > form > "
                                                                               "div:nth-of-type(2) > input")
                if not click_button_result["status"]:
                    raise exception_factory(Exception, click_button_result["detail"])

                # Waiting while vpnjantit preparing config
                click_button_result = self._click_element(element_type=By.CSS_SELECTOR, element_name="section#create > div > div > "
                                                                               "div:nth-of-type(3) > "
                                                                               "div > div > div > center > a",
                                                                               timeout=30)
                if not click_button_result["status"]:
                    raise exception_factory(Exception, click_button_result["detail"])

                config_data = read_config_file(self.__logger, f"{random_login}-{data.get('server')}jantit.conf")
                if config_data is None:
                    raise exception_factory(Exception, "Config file not existed")
                data.update({"config": config_data})
                await self.__CRUD.update_config_request(request_id=request_id, config=config_data)
                return data
            except Exception as e:
                self.__logger.error(f"An error occurred - {e}")
                data.update({"status": False})
                data.update({"detail": str(e)})
                return data
        else:
            return data

    @staticmethod
    def run_async_function(async_func, args):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(async_func(*args))
        loop.close()

    def _close_tab_by_domain(self, domain_name):
        original_window = self.__driver.current_window_handle
        all_windows = self.__driver.window_handles
        for window in all_windows:
            self.__driver.switch_to.window(window)
            current_url = self.__driver.current_url
            if domain_name in current_url:
                self.__driver.close()
                break
        self.__driver.switch_to.window(original_window)

    def _close_overlapping_elements(self) -> dict:
        potential_overlays = [
            [
                By.CSS_SELECTOR,
                "html > body > div:nth-of-type(5) > "
                    "div:nth-of-type(2) > div > "
                    "div:nth-of-type(2) > div:nth-of-type(2) > button > p"
            ],
            [
                By.CSS_SELECTOR,
                "html > body > div:nth-of-type(5) > div > div:nth-of-type(2) > button > i"
            ],
            [
                By.CSS_SELECTOR,
                "html > body > div:nth-of-type(4) > button"
            ]

        ]
        for overlay_element in potential_overlays:
            try:
                if self.__driver.is_element_visible(overlay_element[0], overlay_element[1]):
                    self._click_element(overlay_element[0], overlay_element[1], timeout=5)
            except Exception as e:
                return {"status": False, "detail": str(e)}
        return {"status": True, "detail": None}

    def _click_element(self, element_type: By, element_name: str, timeout: int = 10) -> dict:

        # Scroll the element into view
        def scroll_to():
            # Find the element using its XPath
            element = self.__driver.find_element(element_type, element_name)

            # Scroll the element into the center of the viewport using JavaScript
            self.__driver.execute_script("""
                var element = arguments[0];
                var rect = element.getBoundingClientRect();
                var elementTop = rect.top + window.pageYOffset;
                var elementCenterY = elementTop - (window.innerHeight / 2) + (rect.height / 2);
                window.scrollTo({ top: elementCenterY, behavior: 'smooth' });
            """, element)

        try:
            # Wait for the element to be visible and clickable
            self.__driver.wait_for_element(element_type, element_name, timeout=timeout)
            self.__driver.wait_for_element_visible(element_type, element_name, timeout=timeout)
            scroll_to()
            button_element = self.__driver.find_element(element_type, element_name)
            try:
                button_element.click()
            except:
                # If click fails, use JavaScript to click
                self.__driver.execute_script("arguments[0].click();", button_element)
            return {"status": True, "detail": None}
        except Exception as e:
            return {"status": False, "detail": str(e)}

    def __del__(self):
        if self.__driver is not None:
            self.__driver.quit()

