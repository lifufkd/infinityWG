![{3A3AC56C-1C7A-480A-AF9A-6B4CF0A34C87}](https://github.com/user-attachments/assets/15126378-d6a4-4756-a4b1-d43d073cc26a)
![{8DED573C-2D96-40E5-95A6-3B4883C81B76}](https://github.com/user-attachments/assets/eb99b8ff-cef0-4689-9291-ea7cb5fbb133) 
# InfinityWG Desktop Client

## [EN]
[InfinityWG](https://github.com/lifufkd) is a set of software products: [InfinityWG](https://github.com/lifufkd/infinityWG) - a server for clients: [InfinityWG-desktop-client](https://github.com/lifufkd/InfinityWG-dektop-client).

## License

[GPL V3](https://github.com/lifufkd/InfinityWG-dektop-client#LICENSE)

## Installation

- **Pre-compiled**  
  1. Download the latest [release](https://github.com/lifufkd/InfinityWG-dektop-client/releases).  
  2. Unpack the archive.  
  3. Run the executable file.  

- **Source code**  
  1. Download or clone this repository:  
     - `git clone https://github.com/lifufkd/InfinityWG-dektop-client`  
  2. Install dependencies:  
     - `pip install -r requirements.txt`  
  3. Run the app:  
     - `python app.py`  

## Implemented functions
- Authorization.  
- Registration.  
- Profile system (for storing saved parameters).  
- Auto internet check (allows the application to automatically get a new config from the server in case of loss of Internet connection).  
- Auto definition of the best server by ping (requires the first sync, ~3 minutes).  
- Auto re-sync with the best server in case of a city change (detected by IP).  

## Advantages
- **Ease of use**: All you need to do to get started is register and click connect!  
- **Cross-platform Compatibility**: Supported on Windows, macOS, and Linux.  
- **Modern UI**.  

## Future Plans
1. Add the ability to disable some automatic features in the settings menu.  
2. Add more VPN protocols.  
3. Add a loading screen for some actions.  

## Technical Details
- **Programming Language**: Python 3.11.  
- **GUI Framework**: PySide6 (Qt for Python).  
- **Data Storage**: File storage for local operations and HTTP API for server synchronization.  
- **Architecture**: Modular, with separation of interface and logic layers.  
- **Offline Mode Handling**: Temporarily store data locally and send it to the server upon reconnection.


## [RU]
[InfinityWG](https://github.com/lifufkd) — это набор программных продуктов: [InfinityWG](https://github.com/lifufkd/infinityWG) — сервер для клиентов: [InfinityWG-desktop-client](https://github.com/lifufkd/InfinityWG-dektop-client).

## Лицензия

[GPL V3](https://github.com/lifufkd/InfinityWG-dektop-client#LICENSE)

## Установка

- **Предварительно собранное приложение**  
  1. Скачайте последнюю [версию](https://github.com/lifufkd/InfinityWG-dektop-client/releases).  
  2. Распакуйте архив.  
  3. Запустите исполняемый файл.  

- **Исходный код**  
  1. Скачайте или клонируйте данный репозиторий:  
     - `git clone https://github.com/lifufkd/InfinityWG-dektop-client`  
  2. Установите зависимости:  
     - `pip install -r requirements.txt`  
  3. Запустите приложение:  
     - `python app.py`  

## Реализованные функции
- Авторизация.  
- Регистрация.  
- Система профилей (для хранения сохранённых параметров).  
- Автоматическая проверка интернета (позволяет приложению автоматически получать новый конфиг с сервера при потере соединения).  
- Автоматическое определение лучшего сервера по пингу (требуется первая синхронизация, ~3 минуты).  
- Автоматическая повторная синхронизация с лучшим сервером при смене города (определяется по IP).  

## Преимущества
- **Простота использования**: всё, что нужно для начала работы, это зарегистрироваться и нажать "Подключиться"!  
- **Кроссплатформенность**: поддерживается на Windows, macOS и Linux.  
- **Современный пользовательский интерфейс**.  

## Планы на будущее
1. Добавить возможность отключать некоторые автоматические функции в меню настроек.  
2. Добавить больше VPN-протоколов.  
3. Добавить экран загрузки для некоторых операций.  

## Технические детали
- **Язык программирования**: Python 3.11.  
- **Фреймворк для интерфейса**: PySide6 (Qt for Python).  
- **Хранение данных**: Локальное хранение файлов для оффлайн-операций и HTTP API для синхронизации с сервером.  
- **Архитектура**: Модульная, с разделением интерфейса и логики.  
- **Работа в оффлайн-режиме**: Временное локальное сохранение данных с последующей отправкой на сервер при восстановлении соединения.  
