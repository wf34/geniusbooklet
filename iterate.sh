set +x

if [ $# == 0 ]; then
  echo "Use: ./download_list.txt"
  exit 1
fi

DOWNLOAD_LIST_PATH=$(realpath $1);
DOWNLOAD_LIST=$(cat $DOWNLOAD_LIST_PATH)
IFS='
'
for line in $DOWNLOAD_LIST; do
  IFS=' '
  tuple=( $line )
  URL=${tuple[0]}
  ART_URL=${tuple[1]}
  
  echo ">>>>Iterate through: ${URL} ${ART_URL}
  
  "
  node ./geniusbooklet.js ${URL} --art ${ART_URL}
  IFS='
'
done;
