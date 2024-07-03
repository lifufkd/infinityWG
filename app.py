##########################
#       Created By       #
#          SBR           #
##########################
import time
from modules.wireguard import WireGuard
from modules.logger import Logger
from modules.routing import SetupRouting
from modules.utilities import Utilities
from modules.utilities import ConfigData
##########################
config_path = 'config.json'
##########################


def send_ping():
    try:
        # Starting ping process with config args
        ping_obj = utilities.ping(config.get_value("check_available_host"),
                                config.get_value("client_wg_interface"),
                                config.get_value("check_available_timeout"))
        if ping_obj.returncode != 0:
            # If ping was unsuccessful
            logger.logger.info("No response from WG vpn. Changing config...:")
            return False
        else:
            return True
    except Exception as e:
        # Error running ping utility
        logger.logger.error("Error run ping command:", exc_info=True)
        return None


def main() -> None:
    routing.setup(config.get_value("server_wg_interface"),
                  config.get_value("client_wg_interface"))
    logger.logger.info("111")
    wireguard.stop("/home/sbr/Downloads/ttt.conf")
    wireguard.start("/home/sbr/Downloads/ttt.conf")


if __name__ == '__main__':
    logger = Logger()
    routing = SetupRouting(logger)
    config = ConfigData(config_path)
    utilities = Utilities(logger)
    wireguard = WireGuard(logger)
    main()