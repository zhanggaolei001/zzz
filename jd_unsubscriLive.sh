#!/bin/bash  
count=$(wc -l < /scripts/panel/config/config.sh)
 
node /scripts/jd_unsubscriLive.js 0& 
echo "step 1 running in background"
sleep 1
echo "step 2 sleeped 60"
for i in $(seq 1 $count)  
do    
node /scripts/jd_unsubscriLive.js $i&
echo $i 
sleep 1
done   
 