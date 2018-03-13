set -e
home=$(dirname $0)
if [ $# -lt 2 ]; then
  echo "Use: <path to folder with pdfs> <outputdir>"
  exit 1
fi
src_dir=$(realpath $1)
dst_dir=$(realpath $2)
for line in $(ls $src_dir); do
  if [ ${line: -3} == "pdf" ]; then
    $home/reformat.sh ./$line $dst_dir
  fi
done
