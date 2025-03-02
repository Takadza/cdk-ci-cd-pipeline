#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();
const environments = ["dev", "prod"]
const deploymentEnvironment = app.node.tryGetContext("env");
if(!deploymentEnvironment || !environments.includes(deploymentEnvironment)) throw new
Error("Please supply the env context variable: cdk-deploy  --context env=dev/prod")
let env = app.node.tryGetContext(deploymentEnvironment)
const infrastructureRepoName = app.node.tryGetContext("infrastructureRepoName");
const repositoryOwner = app.node.tryGetContext("repositoryOwner");
env = {
  ...env,
  infrastructureRepoName,
  repositoryOwner,
  description: `Stack for the ${deploymentEnvironment} CI pipeline deployed using
  the CDk. of you need to delete this stack , delete the ${deploymentEnvironment}
  CDK infrastructure stack first`
}

new PipelineStack(app,
  `${deploymentEnvironment}-CI-Pipeline-Stack`,
  env 
);