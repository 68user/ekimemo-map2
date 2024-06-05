#!/usr/bin/env python3

import time
import urllib.request

line_no=1
#line_no=607
skip_line_no=[609]

while True:
  if line_no in skip_line_no:
    print("skip "+str(line_no))
    line_no += 1
    continue

  url = 'https://ekimemo.com/database/line/'+str(line_no)
  print(url)
  try:
      req = urllib.request.Request(url)
      with urllib.request.urlopen(req) as res:
          body = res.read()
          with open("line/line-"+str(line_no)+".html", "wb") as f:
              f.write(body)
  except urllib.error.HTTPError as e:
      if e.getcode() == 404:
          print(url +" is 404")
          break
  except Exception as e:
      print(e)
      
  time.sleep(2)
  line_no += 1
