import boto3
import json
import re
from backend.config import config

# Initialize AWS Bedrock Client
bedrock_client = boto3.client("bedrock-runtime", region_name=config.AWS_BEDROCK_REGION)
max_length = 60000

# Function to call Bedrock AI Model
def extract_lease_info(text, saved_locations):
    payload = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "text": f"""Extract important information (
                            'location_name' map the location name exactly or abbreviation from this list if possible: {saved_locations} as string,
                            'location_address' as string,
                            'start_date' as datetime in format %Y-%m-%d,
                            'end_date' as datetime in format %Y-%m-%d,
                            'cooperation_type' fixed cost lease or revenue share as string,
                            'payment_terms' payment period monthly, quarterly, yearly, etc as string,
                            'monthly_cost_amount' in total amount or revenue share percentage as string,
                            'security_deposit_amount' as string,
                            'last_invoice_due' as datetime in format %Y-%m-%d,
                            'last_invoice_amount' as string,
                            'document_date' as datetime in format %Y-%m-%d,
                            'document_type' agreement or invoice as string,
                            and 'additional_info' as single level json
                        ) from this lease agreement and put it in json format: {text[:max_length]}"""
                    }
                ]
            }
        ],
    }

    response = bedrock_client.invoke_model(
        modelId=config.AWS_BEDROCK_MODEL_ID,
        body=json.dumps(payload),
        contentType="application/json",
        accept="application/json"
    )

    response_body = json.loads(response["body"].read())

    # Extract JSON text from the response
    raw_text = response_body['output']['message']['content'][0]['text']

    # Use regex to extract JSON from markdown block
    json_match = re.search(r'```json\n(.*?)\n```', raw_text, re.DOTALL)
    if json_match:
        extracted_json = json_match.group(1)  # Get the JSON part
        lease_data = json.loads(extracted_json)  # Convert to dictionary
        return lease_data
    else:
        return {"error": "Failed to extract JSON"}

    return response_body
