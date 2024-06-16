
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

cv::Point2d r0[] = {cv::Point2d(3.735, 1.292),  cv::Point2d(0.691, -0.804),
                    cv::Point2d(5.462, -0.050), cv::Point2d(4.535, 0.084),
                    cv::Point2d(1.069, -0.575), cv::Point2d(1.360, -0.758),
                    cv::Point2d(1.889, 0.743),  cv::Point2d(1.504, 0.707),
                    cv::Point2d(2.079, 0.183),  cv::Point2d(5.433, 1.003),
                    cv::Point2d(2.692, 0.270),  cv::Point2d(3.066, 1.036),
                    cv::Point2d(5.996, -1.091), cv::Point2d(1.817, -0.654),
                    cv::Point2d(3.714, -0.453), cv::Point2d(4.243, 0.836)};
cv::Point2d g0[] = {cv::Point2d(1.243, 1.450),  cv::Point2d(4.222, 0.497),
                    cv::Point2d(2.731, 1.495),  cv::Point2d(5.353, -0.368),
                    cv::Point2d(3.614, -0.381), cv::Point2d(1.009, 0.496),
                    cv::Point2d(5.009, -0.654), cv::Point2d(1.242, 0.936),
                    cv::Point2d(0.018, -0.149), cv::Point2d(4.778, -0.676),
                    cv::Point2d(4.305, -0.694), cv::Point2d(5.367, 0.780),
                    cv::Point2d(0.742, 1.374),  cv::Point2d(0.943, 0.810),
                    cv::Point2d(2.768, 1.346),  cv::Point2d(0.929, 0.419)};
cv::Point2d b0[] = {cv::Point2d(3.652, -0.498), cv::Point2d(3.777, -0.498),
                    cv::Point2d(4.828, -1.298), cv::Point2d(0.031, 0.532),
                    cv::Point2d(4.523, 1.305),  cv::Point2d(6.081, 0.801),
                    cv::Point2d(0.005, -0.470), cv::Point2d(0.306, -0.078),
                    cv::Point2d(3.250, 0.042),  cv::Point2d(1.851, -1.297),
                    cv::Point2d(0.561, 0.807),  cv::Point2d(0.687, -0.087),
                    cv::Point2d(4.020, 0.667),  cv::Point2d(0.218, 0.001),
                    cv::Point2d(1.524, 0.272),  cv::Point2d(2.600, -0.976)};

double dist(cv::Point2d const &a, cv::Point2d const &b) {
  double ac = sin(a.y) * sin(b.y) + cos(a.y) * cos(b.y) * cos(a.x - b.x);
  return acos(ac);
}

constexpr size_t ocount = 16;
uint8_t colE(cv::Point2d const &p, cv::Point2d (&o)[ocount]) {
  double d = 0;
  for (size_t i = 0; i < ocount; ++i) {
    d += 3 / (0.5 + dist(p, o[i]));
  }
  return cv::saturate_cast<uint8_t>((sin(d) + 1) / 2 * 255);
}

cv::Vec3b col(double tx, double ty) {
  auto p = cv::Point2d(tx, ty);

  // double d0 = dist(cv::Point2d(2, 1),
  // double d1 = dist(cv::Point2d(1, 2), cv::Point2d(tx, ty));
  // double d2 = dist(cv::Point2d(0, 3), cv::Point2d(tx, ty));
  // double d = std::min({d0, d1, d2});
  // uint8_t c = cv::saturate_cast<uint8_t>((sin(d * 10) + 1) / 2 * 255);
  return cv::Vec3b(colE(p, r0), colE(p, g0), colE(p, b0));
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