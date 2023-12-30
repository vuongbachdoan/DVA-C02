
## Create a security group

aws ec2 create-security-group --group-name ALB-EC2-Access --description "Route 53 Policy Test" --region us-east-1

<!-- sg-05304dc0a7e7553e4 -->

aws ec2 authorize-security-group-ingress --group-name ALB-EC2-Access --protocol tcp --port 22 --cidr 0.0.0.0/0 --region us-east-1

aws ec2 authorize-security-group-ingress --group-name ALB-EC2-Access --protocol tcp --port 80 --cidr 0.0.0.0/0 --region us-east-1

## create auto scaling group

aws autoscaling create-auto-scaling-group --auto-scaling-group-name ASG1 --launch-template "LaunchTemplateName=LT1" --min-size 1 --max-size 3 --desired-capacity 2 --availability-zones "us-east-1a" "us-east-1b" --vpc-zone-identifier "<subnet-id>, <subnet-id>"

aws autoscaling create-auto-scaling-group --auto-scaling-group-name ASG1 --launch-template "LaunchTemplateName=LT1" --min-size 1 --max-size 3 --desired-capacity 2 --availability-zones "us-east-1a" "us-east-1b" --vpc-zone-identifier "subnet-09085e8301e52a86d, subnet-013f1049f968e81a5"

## create target group, load balancer, listener, and then link it all up

aws elbv2 create-target-group --name TG1 --protocol HTTP --port 80 --vpc-id <vpc-id>
aws elbv2 create-target-group --name TG1 --protocol HTTP --port 80 --vpc-id vpc-0a91b318d1bc70682

aws elbv2 create-load-balancer --name ALB1 --subnets <subnet-id> <subnet-id> --security-groups <security-group-id>
aws elbv2 create-load-balancer --name ALB1 --subnets subnet-09085e8301e52a86d subnet-013f1049f968e81a5 --security-groups sg-05304dc0a7e7553e4

aws elbv2 create-listener --load-balancer-arn <alb-arn> --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=<target-group-arn>
aws elbv2 create-listener --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:955228589631:loadbalancer/app/ALB1/1c8ab97bc3d98a1f --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:955228589631:targetgroup/TG1/1bbd0ad2421ad717

aws autoscaling attach-load-balancer-target-groups --auto-scaling-group-name ASG1 --target-group-arns <target-group-arn>
aws autoscaling attach-load-balancer-target-groups --auto-scaling-group-name ASG1 --target-group-arns arn:aws:elasticloadbalancing:us-east-1:955228589631:targetgroup/TG1/1bbd0ad2421ad717

## delete ASG and ALB

aws elbv2 delete-load-balancer --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:955228589631:loadbalancer/app/ALB1/1c8ab97bc3d98a1f 

aws autoscaling delete-auto-scaling-group --auto-scaling-group-name ASG1 --force-delete