from fastapi import APIRouter, HTTPException
from typing import List, Optional
from __future__ import print_statement
import time
import swagger_client
from swagger_client.rest import ApiException
from pprint import pprint

swagger_client.configuration.access_token = 'YOUR_ACCESS_TOKEN'

api_instance = swagger_client.RoutesApi()

router = APIRouter(prefix="/maps", tags=["maps"])

@router.get("/", response_model=dict)
async def get_map_strava(int: temp):
    """Get a GPX file from Strava"""
    id = 
    try: 
        api_instance.getRouteAsGPX(id)
    except ApiException as e:
        print("Exception when calling RoutesApi->getRouteAsGPX: %s\n" % e)
    return map


# TODO: Implement this
@router.get("/compare", response_model=dict)
async def compare_map(int: temp, int: temp2):
    """Compare two GPX files"""
    file1 = get_map_strava(temp)
    file2 = get_map_strava(temp2)

    return {"map1": map1, "map2": map2}





