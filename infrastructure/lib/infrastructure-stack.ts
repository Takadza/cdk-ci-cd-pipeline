import { StackProps, Stack, RemovalPolicy } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface InfrastructureStacksProps extends StackProps{
  DEPLOY_ENVIRONMENT: string;
}

export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props: InfrastructureStacksProps) {
    super(scope, id, props);

    const { DEPLOY_ENVIRONMENT } = props;

    console.log(`${DEPLOY_ENVIRONMENT} environment detected deploying s3 bucket`);

    const infrastructureBucket = new Bucket(this, 'Infrastructure',{
      bucketName: `takadza-${DEPLOY_ENVIRONMENT}-infrastructure-bucket`,
      removalPolicy: RemovalPolicy.DESTROY
    })

   
  }
}
