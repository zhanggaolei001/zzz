#!/bin/bash  
count=$(wc -l < /scripts/panel/config/config.sh) 
for i in $(seq 0 $count)  
do    
node /scripts/jd_blueCoin.js $i& 
done   
 