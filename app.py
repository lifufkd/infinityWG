##########################
#       Created By       #
#          SBR           #
##########################
import logging
from modules.wireguard import WireGuard
##########################
config = 'config.json'
##########################


if __name__ == '__main__':
    logging.log()
    wireguard = WireGuard()
    wireguard.stop('/home/sbr/Downloads/ttt.conf')
    external_ip = wireguard.get_ip()
    print(wireguard.get_country_by_ip(external_ip))