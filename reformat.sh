set -e

if [ $# -lt 2 ]; then
  echo "Use: <source file> <destination folder>"
  exit 1
fi

filepath=$(realpath $1)
filename=$(basename $filepath)
dstdir=$(realpath $2)

if [ "${filepath: -3}" != "pdf" ]; then
  echo "expect pdf as an input ${filepath}"
  exit 1
fi

title_filepath=$(realpath "$dstdir/${filename: 0: -4}_title.pdf")
text_filepath=$(realpath "$dstdir/${filename: 0: -4}_text.pdf")

pages_amount=$(pdftk $filepath dump_data | grep NumberOfPages | egrep -o '[0-9]{1,4}')
prelast_page=$(( $pages_amount - 1))
text_pages_amount=$(( ${pages_amount} - 2))
empty_pages_to_add=0
while [ 0 != $(( (${text_pages_amount} + ${empty_pages_to_add}) % 4 )) ]; do
  empty_pages_to_add=$((${empty_pages_to_add} + 1))
done
echo "text_pages_amount: ${text_pages_amount}; empty_pages_to_add: ${empty_pages_to_add}"

blank_page="/tmp/pageblanche.pdf"
echo "" | ps2pdf -sPAPERSIZE=a6 - $blank_page

pdftk $filepath cat 1 $pages_amount output $title_filepath 
pdftk $filepath cat 2-${prelast_page} output "${text_filepath}0"
for i in $(seq 1 ${empty_pages_to_add}); do
  pdftk "${text_filepath}$((${i} - 1))" ${blank_page} cat output "${text_filepath}${i}"
done

mv "${text_filepath}${empty_pages_to_add}" ${text_filepath}

for i in $(seq 0 ${empty_pages_to_add}); do
  rm -f "${text_filepath}${i}"
done
