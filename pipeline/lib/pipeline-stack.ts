import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SecretValue, Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { CompositePrincipal, PolicyDocument, PolicyStatement, ServicePrincipal, Role} from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { version } from 'node:os';
import { CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';

interface PipelineStackProps extends StackProps{
  envName: string;
  infrastructureRepoName: string;
  infrastructureBranchName: string;
  repositoryOwner: string;

}


export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);
    console.log(props)
    const {
      envName,
      infrastructureRepoName,
      infrastructureBranchName,
      repositoryOwner
    } = props

    const gitHubToken = SecretValue.secretsManager("github-token");

    const infrastructureDeployRole = new Role(
      this,
      'InfrastructureDeployRole',{
        assumedBy: new  CompositePrincipal(
          new ServicePrincipal('codebuild.amazonaws.com'),
          new ServicePrincipal('codepipeline.amazonaws.com')
        ),
        inlinePolicies: {
          CdkDeployPermissions: new PolicyDocument(
            {
              statements: [
                new PolicyStatement({
                  actions: ['sts:AssumeRole'],
                  resources: ['arn:aws:iam::*:role/cdk-*']
                })
              ]
            }
          )
        }
      }
    )

    const artifactBucket = new Bucket(
      this,
      "ArtfactBucket",
      {
        bucketName: `takadza-${envName}-codepipeline-artifact-bucket`,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }
    )

    const infrastructureSourceOutput = new Artifact('infrastructureSourceOutput');

    const infrastructureBuildProject = new  PipelineProject(
      this,
      'InfrastructureProject',
      {
        role: infrastructureDeployRole,
        environment:{
          buildImage: LinuxBuildImage.AMAZON_LINUX_2_5
        },
        environmentVariables: {
          DEPLOY_ENVIRONMENT: {
            value: envName
          }
        },
        buildSpec: BuildSpec.fromObject({
          version: '0.2',
          phases: {
            install:{
              'runtime-versions':{
                nodejs: '20.x'
              },
              commands:[
                'npm install -g aws-cdk',
                'cd infrastructure',
                'npm install'
              ]
            },
            build:{
              command: [
                `cdk deploy --context env=${envName}`
              ]
            }
          }
        })
      }
    )

    const pipeline = new Pipeline(this, 'CiPipeline',{
      pipelineName: `${envName}-CI-Pipeline`,
      role: infrastructureDeployRole,
      artifactBucket
    })

    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new GitHubSourceAction({
          owner: repositoryOwner,
          repo: infrastructureRepoName,
          actionName: 'InfrastructureSource',
          branch: infrastructureBranchName,
          output: infrastructureSourceOutput,
          oauthToken: gitHubToken
        })
      ]
    })

    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new CodeBuildAction({
          actionName: 'DeployCdkInfrastructure',
          project: infrastructureBuildProject,
          input: infrastructureSourceOutput,
          role: infrastructureDeployRole
        })
      ]
    })



   }
}
