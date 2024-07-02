##########################
#       Created By       #
#          SBR           #
##########################
import requests
import logging
import subprocess
from pyroute2 import IPRoute
from dotenv import load_dotenv
import os
##########################
config = 'config.json'
##########################


class WireGuard:
    def __init__(self):
        super(WireGuard, self).__init__()
        load_dotenv()

    def start(self, config_path):
        try:
            result = subprocess.run(['sudo', 'wg-quick', 'up', config_path], check=True, capture_output=True, text=True)
            print(result.stdout)
        except subprocess.CalledProcessError as e:
            print(f"Error starting WireGuard: {e.stderr}")

    def stop(self, config_path='/etc/wireguard/wg0.conf'):
        try:
            result = subprocess.run(['sudo', 'wg-quick', 'down', config_path], check=True, capture_output=True,
                                    text=True)
            print(result.stdout)
        except subprocess.CalledProcessError as e:
            print(f"Error stopping WireGuard: {e.stderr}")

    @staticmethod
    def get_ip():
        try:
            response = requests.get('https://api.ipify.org?format=json')
            response.raise_for_status()  # Raise an exception for HTTP errors
            ip_data = response.json()
            return ip_data['ip']
        except requests.RequestException as e:
            print(f"Error fetching external IP address: {e}")
            return None

    @staticmethod
    def get_country_by_ip(ip_address):
        token = os.getenv('IPINFO_API_TOKEN')
        if not token:
            print("API token not found. Please check your .env file.")
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
        except requests.RequestException as e:
            print(f"Error fetching country for IP {ip_address}: {e}")
            return None