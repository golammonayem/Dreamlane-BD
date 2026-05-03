CREATE DATABASE IF NOT EXISTS dreamlane_bd;
CREATE USER IF NOT EXISTS 'dreamlane_user'@'%' IDENTIFIED BY 'dreamlane_pass';
GRANT ALL PRIVILEGES ON dreamlane_bd.* TO 'dreamlane_user'@'%';
FLUSH PRIVILEGES;
