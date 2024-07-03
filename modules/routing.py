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

    def setup(self, server_interface, client_interface):
        # 1. Настройка маршрутизации

        # Разрешаем пересылку пакетов
        self.self.run_command("sudo sysctl -w net.ipv4.ip_forward=1")

        # Создание маркера и новой таблицы маршрутизации
        self.run_command("sudo ip rule add fwmark 10 table 100")

        # Добавляем таблицу маршрутизации
        with open("/etc/iproute2/rt_tables", "a") as rt_tables:
            rt_tables.write(f"100    {client_interface}\n")

        # Настройка маршрута по умолчанию для новой таблицы
        self.run_command(f"sudo ip route add default dev {client_interface} table 100")

        # 2. Настройка iptables для маркировки пакетов

        # Маскарад для выхода в интернет через второй интерфейс
        self.run_command(f"sudo iptables -t nat -A POSTROUTING -o {client_interface} -j MASQUERADE")

        # Перенаправление трафика от WireGuard клиентов через wg0 к wg1
        self.run_command(f"sudo iptables -A FORWARD -i {server_interface} -o {client_interface} -j ACCEPT")
        self.run_command(f"sudo iptables -A FORWARD -i {client_interface} -o {server_interface} -m state --state RELATED,ESTABLISHED -j ACCEPT")

        # Маркировка пакетов, отправленных через интерфейс wg1
        self.run_command(f"sudo iptables -t mangle -A OUTPUT -o {client_interface} -j MARK --set-mark 10")

        # Сохраняем правила iptables
        self.run_command("sudo sh -c 'iptables-save > /etc/iptables/rules.v4'")