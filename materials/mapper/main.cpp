
#include <cstdint>
#include <fstream>
#include <iostream>
#include <numbers>
#include <numeric>
#include <opencv2/opencv.hpp>
#include <random>
#include <set>
#include <stdexcept>
#include <tuple>
#include <vector>

using namespace std;

constexpr int h = 256;
constexpr int w = h * 2;

double dist(cv::Point2d const &a, cv::Point2d const &b) {
  double ac = sin(a.y) * sin(b.y) + cos(a.y) * cos(b.y) * cos(a.x - b.x);
  return acos(ac);
}

cv::Vec3b col(double tx, double ty) {
  double d = dist(cv::Point2d(0.1, 0.2), cv::Point2d(tx, ty));
  uint8_t c = cv::saturate_cast<uint8_t>((sin(d * 10) + 1) / 2 * 255);
  return cv::Vec3b(c, c, c);
}

cv::Mat make_image() {
  cv::Mat im = cv::Mat::zeros(h, w, CV_8UC3);
  for (int iy = 0; iy < h; ++iy) {
    double ty = (iy / (h - 1.0) + 0.5) * std::numbers::pi;
    double xlen = std::sin(ty);
    for (int ix = 0; ix < w; ++ix) {
      double tx = ix * std::numbers::pi * 2 / (w - 1);
      im.at<cv::Vec3b>(iy, ix) = col(tx, ty);
    }
  }
  return im;
}

int main(int argc, char const *argv[]) {
  try {
    cv::Mat image = make_image();
    cv::imwrite(argv[1], image);
    cv::imwrite(argv[2], image);
    return 0;
  } catch (std::exception &e) {
    std::cout << "ERR!! " << e.what() << std::endl;
    return 1;
  }
}