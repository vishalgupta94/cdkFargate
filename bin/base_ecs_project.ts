#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { ApplicationStack } from '../lib/base_ecs_project-stack';

type APP_ENVS = {
  CDK_DEPLOY_ACCOUNT: string,
  CDK_DEPLOY_REGION: string
}

class Application extends App {

  constructor(private readonly APP_NAME: string) {
    super();
    this.deployApplicationStack()
;  }

  deployApplicationStack() {
    const appEnvs = this.node.tryGetContext(this.APP_NAME) as APP_ENVS
    new ApplicationStack(this, `${this.APP_NAME}-ApplicationStack`, {
      APP_NAME: this.APP_NAME,
      ENV: {
        region: appEnvs.CDK_DEPLOY_REGION,
        account: appEnvs.CDK_DEPLOY_ACCOUNT
      }
    });
  }
}

new Application("baseecsprojects");