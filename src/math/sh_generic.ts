// Generic real-valued spherical harmonics:
//
//   Y_l_m(theta, phi) = PHI_m(phi) * K_l_m * P_l_m * cos(theta)
//
// where:
//
//               / sqrt(2) * cos(mx),   m > 0
//   PHI_m(x) = <  1,                   m == 0
//               \ sqrt(2) * sin(-mx),  m < 0
//
//      K_l_m = sqrt(((2l + 1) / (4pi)) * ((l - m)! / (l + m)!))
//
//   (l - m) * P_l_m = x * (2l - 1) * P_l-1_m - (l + m - 1) * P_l-2_m
//             P_m_m = -1^m * (2m - 1)!! * (1 - x^2)^(m/2)
//           P_m+1_m = x * (2m + 1) * P_m_m

export namespace sh_generic {

const factorial = (() => {
  let result = [1];
  for (let i = 1; i <= 32; ++i) {
    result.push(result[i - 1] * i);
  }
  return result;
})();

export function P(l: number, m: number, x: number) {
  let pmm = 1;
  if (m > 0) {
    let somx2 = Math.sqrt((1 - x) * (1 + x));
    let fact = 1;
    for(let i = 1; i <= m; i++) {
      pmm *= (-fact) * somx2;
      fact += 2;
    }
  }

  if (l == m) {
    return pmm;
  }

  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l == m + 1) {
    return pmmp1;
  }

  let pll = 0;
  for(let ll = m + 2; ll <= l; ++ll) {
    pll = ((2 * ll - 1) * x * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll;
}

export function K(l: number, m: number) {
  return Math.sqrt(
      ((2 * l + 1) * factorial[l - m]) /
      (4 * Math.PI * factorial[l + m]));
}

/**
 * @param l SH band in the range [0..N]
 * @param m SH order in the range [-l..l]
 * @param theta angle in the range [0..pi]
 * @param phi angle in the range [0..2*pi]
 */
export function SH(l: number, m: number, theta: number, phi: number) {
  const sqrt2 = Math.sqrt(2);

  if (m == 0) {
    return K(l, 0) * P(l, m, Math.cos(theta));
  } else if (m > 0) {
    return sqrt2 * K(l, m) * Math.cos(m * phi) * P(l, m, Math.cos(theta));
  } else {
    return sqrt2 * K(l, -m) * Math.sin(-m * phi) * P(l, -m, Math.cos(theta));
  }
}

}
