run() {
    node ./simple.js --client=false --rs=false &
    pid=`ps -A -o pid,cmd | grep simple.js | grep -v grep |head -n 1 | awk '{print $1}'`
    time node ./simple.js --cycles=100000 --rs=false &
    time node ./simple.js --cycles=100000 --rs=false &
    time node ./simple.js --cycles=100000 --rs=false
    kill `echo "$pid"`
}


run;
