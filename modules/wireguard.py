##########################
#       Created By       #
#          SBR           #
##########################
import requests
import subprocess
from dotenv import load_dotenv
import os
##########################
config = 'config.json'
##########################


class WireGuard:
    def __init__(self, logger):
        super(WireGuard, self).__init__()
        self.__logger = logger
        load_dotenv()

    def start(self, config_path):
        try:
            subprocess.run(['sudo', 'wg-quick', 'up', config_path], check=True, capture_output=True, text=True)
            self.__logger.logger.info("Successfully start WireGuard:")
        except subprocess.CalledProcessError as e:
            self.__logger.logger.error("Error starting WireGuard:")
        except Exception as e:
            self.__logger.logger.error("Error, WireGuard not found:")

    def stop(self, config_path):
        try:
            subprocess.run(['sudo', 'wg-quick', 'down', config_path], check=True, capture_output=True,
                                    text=True)
            self.__logger.logger.info("Successfully stop WireGuard:")
        except subprocess.CalledProcessError as e:
            self.__logger.logger.error("Error stopping WireGuard:")
        except Exception as e:
            self.__logger.logger.error("Error, WireGuard not found:")

    def get_ip(self):
        try:
            response = requests.get('https://api.ipify.org?format=json')
            response.raise_for_status()  # Raise an exception for HTTP errors
            ip_data = response.json()
            return ip_data['ip']
        except Exception as e:
            self.__logger.logger.error("Error getting IP:", exc_info=True)
            return None

    def get_country_by_ip(self, ip_address):
        token = os.getenv('IPINFO_API_TOKEN')
        if not token:
            self.__logger.logger.error("API token not found. Please check your .env file")
            return None

        url = f"https://ipinfo.io/{ip_address}/json"
        headers = {
            "Authorization": f"Bearer {token}"
        }

        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()  # Поднять исключение для HTTP ошибок
            data = response.json()
            return data.get('country', 'Country not found')
        except Exception as e:
            self.__logger.logger.error("Error fetching country IP", exc_info=True)
            return None