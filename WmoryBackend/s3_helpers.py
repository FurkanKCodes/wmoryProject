import os
import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from dotenv import load_dotenv

load_dotenv()

# --- AWS CONFIGURATION ---
BUCKET_NAME = os.getenv('AWS_BUCKET_NAME')
REGION = os.getenv('AWS_REGION', 'eu-north-1') 

# Initialize S3 Client
s3_client = boto3.client(
    's3',
    region_name=REGION
)

def upload_file_to_s3(file_name, object_name=None):
    """
    Upload a file to an S3 bucket
    :param file_name: File to upload (local path)
    :param object_name: S3 object name. If not specified then file_name is used
    :return: True if file was uploaded, else False
    """
    if object_name is None:
        object_name = os.path.basename(file_name)

    try:
        # Upload the file
        # ExtraArgs={'ACL': 'private'} is default but good to be explicit if not blocking public access
        s3_client.upload_file(file_name, BUCKET_NAME, object_name)
        print(f"✅ Uploaded to S3: {object_name}")
        return True
    except FileNotFoundError:
        print("❌ The file was not found")
        return False
    except NoCredentialsError:
        print("❌ Credentials not available")
        return False
    except Exception as e:
        print(f"❌ S3 Upload Error: {e}")
        return False

def get_presigned_url(object_name, expiration=900):
    """
    Generate a presigned URL to share an S3 object
    :param object_name: string
    :param expiration: Time in seconds for the presigned URL to remain valid (Default: 15 mins)
    :return: Presigned URL as string. If error, returns None.
    """
    try:
        response = s3_client.generate_presigned_url('get_object',
                                                    Params={'Bucket': BUCKET_NAME,
                                                            'Key': object_name},
                                                    ExpiresIn=expiration)
        return response
    except ClientError as e:
        print(f"❌ S3 Presign Error: {e}")
        return None

def delete_file_from_s3(object_name):
    """
    Delete a file from an S3 bucket
    """
    try:
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=object_name)
        print(f"🗑️ Deleted from S3: {object_name}")
        return True
    except ClientError as e:
        print(f"❌ S3 Delete Error: {e}")
        return False


def generate_presigned_post_url(object_name, file_type, expiration=3600):
    """
    Generate a presigned URL to allow direct upload (PUT) from the mobile app to S3.
    """
    try:
        # Generate the presigned URL for a PUT request
        url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': object_name,
                'ContentType': file_type
            },
            ExpiresIn=expiration
        )
        return url
    except ClientError as e:
        print(f"❌ S3 Presign POST Error: {e}")
        return None