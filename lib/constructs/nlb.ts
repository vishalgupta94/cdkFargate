import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs'
import { FargateTaskDefinition, ContainerImage, Cluster } from 'aws-cdk-lib/aws-ecs';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { NetworkLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
interface NetworkLoadBalancerProps extends cdk.StackProps{
    APP_NAME: string,
    cluster: Cluster
}
export class NetworkLoadBalancer extends Construct {
    constructor(scope: Construct, id: string, props: NetworkLoadBalancerProps) {
        super(scope, id);
        const imagePath = path.join(__dirname, '../dockerImages/Redis');

        console.log("imagePath",imagePath);
        // works as an ecs agent
        const executionRole = new Role(this, 'role', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com')
        })
        executionRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonECSTaskExecutionRolePolicy"))
        const taskRole = new Role(this, 'role', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com')
        })
        taskRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonECSTaskExecutionRolePolicy"))
        
        const fargateTaskDefination = new FargateTaskDefinition(this, 'FargateTaskDefinition', {
            cpu: 256,
            memoryLimitMiB: 512,
            taskRole,
            executionRole
        })

        fargateTaskDefination.addContainer('id', {
            image: ContainerImage.fromAsset(imagePath),
            environment: {
                'NAME': 'vishal'
            }
        })

        const nlbLoadBalancer = new NetworkLoadBalancedFargateService(this,`${props.APP_NAME}-nlb`,{
            cluster: props.cluster,
            vpc: props.cluster
        })

    }


}