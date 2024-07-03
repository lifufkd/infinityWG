##########################
#       Created By       #
#          SBR           #
##########################
import subprocess
##########################

##########################


class SetupRouting:
    def __init__(self, logger):
        self.__logger = logger
        super(SetupRouting, self).__init__()

    def run_command(self, command):
        try:
            subprocess.run(command, shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.__logger.logger.info(f"Command '{command}' executed successfully.")
        except Exception as e:
            self.__logger.logger.error(f"Error executing command '{command}':")

    def get_wg_gateway(self, interface):
        """
        Получает IP-адрес шлюза интерфейса WireGuard.

        Args:
        interface (str): Имя интерфейса WireGuard, по умолчанию "wg0".

        Returns:
        str: IP-адрес шлюза интерфейса.
        """
        try:
            result = subprocess.run(f"ip route show dev {interface}", shell=True, check=True, stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE)
            for line in result.stdout.decode().splitlines():
                if "default" in line:
                    return line.split()[2]  # Предполагаем, что IP-адрес шлюза третий элемент в строке
        except subprocess.CalledProcessError as e:
            print(f"Command to get wg gateway failed with error: {e.stderr.decode()}")
            return None

    def get_wireguard_subnet(self, interface):
        """
        Получает подсеть WireGuard.

        Args:
        interface (str): Имя интерфейса WireGuard, по умолчанию "wg0".

        Returns:
        str: Подсеть WireGuard.
        """
        try:
            result = subprocess.run(f"ip addr show dev {interface}", shell=True, check=True, stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE)
            for line in result.stdout.decode().splitlines():
                if "inet" in line:
                    return line.split()[1]  # Предполагаем, что подсеть второй элемент в строке
        except subprocess.CalledProcessError as e:
            print(f"Command to get WireGuard subnet failed with error: {e.stderr.decode()}")
            return None

    def setup(self, server_interface, client_interface):
        client_gateway = self.get_wg_gateway(client_interface)
        server_subnet = self.get_wireguard_subnet(server_interface)
        commands = [
            # Маркировка трафика из WireGuard контейнера
            f"sudo iptables -t mangle -A PREROUTING -i docker0 -s {server_subnet} -j MARK --set-mark 1",

            # Маршрутизация маркированного трафика через wg0
            "sudo ip rule add fwmark 1 table 200",
            f"sudo ip route add default via {client_gateway} dev {client_interface} table 200",

            # Настройка NAT для трафика из WireGuard
            f"sudo iptables -t nat -A POSTROUTING -o {client_interface} -j MASQUERADE",

            # Правило для маршрутизации трафика с основного интерфейса через основное подключение (например, eth0)
            "sudo ip route add default via $(ip route | grep default | grep -v ttt | awk '{print $3}') table 201",

            # Добавление правила маршрутизации для основного интерфейса (например, eth0)
            "sudo ip rule add from $(ip addr show wlp1s0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1) table 201"
        ]
        for cmd in commands:
            self.run_command(cmd)
        self.__logger.logger.info(f"Routing successfully set up!")
