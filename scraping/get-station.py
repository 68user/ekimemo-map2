#!/usr/bin/env python3

import time
import urllib.request

# 5076 404
# 5204 404
station_no=7885
last_station_no=9400

while True:
  url = 'https://ekimemo.com/database/station/'+str(station_no)+'/activity'
  print(url)
  try:
      req = urllib.request.Request(url)
      with urllib.request.urlopen(req) as res:
          body = res.read()
          with open("station/s"+str(station_no)+".html", "wb") as f:
              f.write(body)
  except urllib.error.HTTPError as e:
      if e.getcode() == 404:
          print(url +" is 404")
  except Exception as e:
      print(e)
      
  time.sleep(5)
  if station_no == last_station_no:
    break
  station_no += 1
