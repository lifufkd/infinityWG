#####################################
#            Created by             #
#               sbr                 #
#####################################
import os
import sys
import json
import time
import socket
import struct
import select
import random
import string
from typing import Optional
from modules.DB.connectors.mysql import MySql
from modules.DB.connectors.sqlite import Sqlite3
#####################################


def exception_factory(exception, message) -> Optional[Exception]:
    return exception(message)


def replace_args_for_db(db: MySql | Sqlite3, query: str) -> Optional[str]:
    if db.type == 'sqlite3':
        query = query.replace("%s", "?")
    return query


def check_config_key_existed(config, logger, key) -> Optional[any]:
    value = config.get_config_data(key)
    if value is not None:
        return value
    else:
        logger.error(f"{key} parameter unfilled!")
        sys.exit()


def write_json_file(logger, path, data) -> Optional[bool]:
    try:
        with open(path, 'w') as file:
            file.write(json.dumps(data, indent=4))
            file.close()
            return True
    except:
        logger.error("Permission error while saving file!")
        sys.exit()


def read_json_file(logger, path) -> Optional[dict]:
    try:
        with open(path, 'r') as file:
            data = json.loads(file.read())
            file.close()
        return data
    except:
        logger.error("The json file is corrupted or missing!")
        sys.exit()


def get_ip_address_by_domain(domain_name):
    for i in range(3):
        try:
            ip_address = socket.gethostbyname(domain_name)
            return ip_address
        except socket.gaierror as e:
            time.sleep(1)
    return None


def get_best_server(servers: dict, country: str, server_number: str = None) -> Optional[str]:
    server_pings = dict()
    selected_country = servers[country]
    if server_number is not None:
        for index, server in enumerate(selected_country):
            server_pings.update({server[2]: index})
        min_ping = min(list(server_pings.keys()))
        return selected_country[server_pings[min_ping]]
    else:
        for server in selected_country:
            if server[1] == server_number:
                return server


def generate_random_string(length):
    """
    Генерирует случайную строку заданной длины из заглавных и строчных букв латинского алфавита и цифр.

    Аргументы:
    length (int): Длина генерируемой строки.

    Возвращает:
    str: Случайная строка заданной длины.
    """
    # Создаем список всех символов, из которых будет генерироваться строка
    characters = string.ascii_letters + string.digits

    # Генерируем случайную строку указанной длины
    random_string = ''.join(random.choice(characters) for _ in range(length))

    return random_string


def read_config_file(logger, file_name, timeout=30) -> Optional[str] or None:
    counter = 0
    try:
        while True:
            if counter >= timeout:
                raise exception_factory(TimeoutError, "Timeout error")
            if os.path.exists(f"./downloaded_files/{file_name}"):
                with open(f"./downloaded_files/{file_name}", 'r') as file:
                    data = file.read()
                    file.close()
                os.remove(f"./downloaded_files/{file_name}")
                return data
            else:
                counter += 1
                time.sleep(1)
    except PermissionError:
        logger.error("Permission error while opening config file")
        return None
    except TimeoutError:
        logger.error("Еhe config did not download")
        return None



def ping(host, timeout=1):
    """
    Ping a host using ICMP ECHO_REQUEST.
    Returns True if the host responds within the timeout, False otherwise.
    """
    try:
        # Create a raw socket
        icmp = socket.getprotobyname('icmp')
        sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, icmp)

        # Resolve the IP address of the host
        ip = socket.gethostbyname(host)

        # Build the ICMP header with a 0 checksum
        header = struct.pack('!BBHHH', 8, 0, 0, 0, 0)
        data = b'Hello, World!'  # Payload

        # Calculate the checksum on the header and data
        checksum = calculate_checksum(header + data)

        # Build the final ICMP packet
        header = struct.pack('!BBHHH', 8, 0, checksum, 0, 0)
        packet = header + data

        # Send the packet to the host
        start_time = time.time()
        sock.sendto(packet, (ip, 1))

        # Wait for the response
        ready = select.select([sock], [], [], timeout)
        if ready[0]:
            sock.recvfrom(1024)  # Receive data from the socket
            return True
        else:
            return False
    except socket.gaierror:
        return False
    except socket.error:
        return False
    finally:
        sock.close()


def calculate_checksum(data):
    """
    Calculate the checksum of the ICMP packet.
    """
    checksum = 0
    countTo = (len(data) // 2) * 2

    for count in range(0, countTo, 2):
        thisVal = data[count + 1] * 256 + data[count]
        checksum = checksum + thisVal
        checksum = checksum & 0xffffffff

    if countTo < len(data):
        checksum = checksum + data[len(data) - 1]
        checksum = checksum & 0xffffffff

    checksum = (checksum >> 16) + (checksum & 0xffff)
    checksum = checksum + (checksum >> 16)

    answer = ~checksum
    answer = answer & 0xffff
    answer = answer >> 8 | (answer << 8 & 0xff00)

    return answer