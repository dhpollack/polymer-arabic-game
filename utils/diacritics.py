#! /usr/bin/env python
# coding=UTF-8
import unicodedata
import json
import codecs
import sys

filetoread = sys.argv

def strip_accents(s):
   return ''.join(c for c in unicodedata.normalize('NFD', s)
                  if unicodedata.category(c) != 'Mn')
newjson = []

with codecs.open(filetoread[1],'r', 'utf-8') as data_file:    
    data = json.load(data_file)
    for word in data:
        entry = word
        entry['ohne'] = strip_accents(word['word'])
        newjson.append(entry)
with codecs.open(filetoread[1].replace(".json", "-stpacc.json"), 'w', 'utf-8') as writejson:
    json.dump(newjson, writejson, ensure_ascii=False)
   
    
