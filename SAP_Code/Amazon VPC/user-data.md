#!/bin/bash
yum update -y
yum install -y httpd
sudo service httpd restart
systemctl start httpd
systemctl enable httpd