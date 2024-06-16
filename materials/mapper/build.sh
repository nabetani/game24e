set -eu

cd $(dirname $0)
cv=/opt/homebrew/Cellar/opencv/4.9.0_9/

inc="-I ${cv}include/opencv4"

libsrc=""

lib="-L${cv}lib/"
lib="${lib} -lopencv_core -lopencv_imgcodecs -lopencv_imgproc"
opts="-fexceptions -std=c++20 -Wall -O2"
clang++ ${opts} ${inc} ${lib} main.cpp ${libsrc} -o mapper
./mapper ../wall0.png ../../src/assets/wall0.webp
