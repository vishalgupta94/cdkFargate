import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc, SecurityGroup, Peer, Port } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, Protocol, LogDrivers} from 'aws-cdk-lib/aws-ecs';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import * as path from 'path';
import { NetworkLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { NetworkLoadBalancer , Protocol as NLBProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
interface ApplicationStackProps extends cdk.StackProps {
  APP_NAME: string,
  ENV: {
    region: string,
    account: string
  }
}

export class ApplicationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, { ...props, env: { ...props.ENV } });

    const vpc = new Vpc(this, `${props.APP_NAME}-vpc`, {
      vpcName: `${props.APP_NAME}-vpc`
    });
    const cluster = new Cluster(this, `${props.APP_NAME}-cluster`, {
      vpc,
      clusterName: `${props.APP_NAME}-fargate-cluster`
    });


    const imagePath = path.join(__dirname, './dockerImages/Redis');

    console.log("imagePath", imagePath);
    // works as an ecs agent
    const executionRole = new Role(this, `${props.APP_NAME}-taskexecutionRole`, {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com')
    })
    executionRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"))
    executionRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"));
    
    const taskRole = new Role(this, `${props.APP_NAME}-role`, {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com')
    })
    taskRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"))
    // executionRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"));
    const fargateTaskDefination = new FargateTaskDefinition(this, 'FargateTaskDefinition', {
      cpu: 256,
      memoryLimitMiB: 512,
      taskRole,
      executionRole
    })

    fargateTaskDefination.addContainer(`${props.APP_NAME}-redisContainer`, {
      portMappings: [{
        containerPort: 6379,
        protocol: Protocol.TCP
      }],
      image: ContainerImage.fromAsset(imagePath),
      logging: LogDrivers.awsLogs({
        streamPrefix: `${props.APP_NAME}-log`,
      }),
      environment: {
        'NAME': 'vishal'
      },
      
    })

    const securityGroup = new SecurityGroup(this, `${props.APP_NAME}-redisSecurityGroup`, {
      vpc,
      allowAllOutbound: true,
      securityGroupName: `${props.APP_NAME}-redisSecurityGroup`
    });

    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(6379), 'Security Group for Elastic Cache(Redis)');
    const redisService = new FargateService(this, `${props.APP_NAME}-redisService`, {
      assignPublicIp: true,
      taskDefinition: fargateTaskDefination,
      cluster,
      desiredCount: 1,
      securityGroups: [securityGroup]
    })

    const nlb = new NetworkLoadBalancer(this,`${props.APP_NAME}-NetworkLoadBalancer`,{
      vpc,
      crossZoneEnabled: true,
      loadBalancerName: `${props.APP_NAME}-nlb`,
      internetFacing: true,
    })

    const listener = nlb.addListener(`${props.APP_NAME}-listener`,{
       port:6379,
    }) 

    listener.addTargets(`${props.APP_NAME}-targets`,{
        port:6379,
        protocol: NLBProtocol.TCP,
        targets: [redisService]
    })
    

  }
}
