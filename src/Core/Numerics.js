/*
  This file contains code modified from JSXGraph, which is copyright 2008-2018
    Matthias Ehmann,
    Michael Gerhaeuser,
    Carsten Miller,
    Bianca Valentin,
    Alfred Wassermann,
    Peter Wilfahrt

  Redistributed and modified under the terms of the

    * GNU Lesser General Public License as published by
      the Free Software Foundation, either version 3 of the License, or
      (at your option) any later version
    OR
    * MIT License: https://github.com/jsxgraph/jsxgraph/blob/master/LICENSE.MIT

 */

export default class Numerics {
  constructor({
    maxIterationsRoot = 80,
    maxIterationsMinimize = 500,
    eps = 0.000001,
  } = {}) {
    this.maxIterationsRoot = maxIterationsRoot;
    this.maxIterationsMinimize = maxIterationsMinimize;
    this.eps = eps;
  }

  /**
   *
   * Find zero of an univariate function f.
   * @param {function} f Function, whose root is to be found
   * @param {Array,Number} x0  Start value or start interval enclosing the root
   * @param {Object} object Parent object in case f is method of it
   * @returns {Number} the approximation of the root
   * Algorithm:
   *  G.Forsythe, M.Malcolm, C.Moler, Computer methods for mathematical
   *  computations. M., Mir, 1980, p.180 of the Russian edition
   *
   * If x0 is an array containing lower and upper bound for the zero
   * algorithm 748 is applied. Otherwise, if x0 is a number,
   * the algorithm tries to bracket a zero of f starting from x0.
   * If this fails, we fall back to Newton's method.
   */
  fzero(f, x0, object) {
    var a,
      b,
      c,
      fa,
      fb,
      fc,
      aa,
      blist,
      i,
      len,
      u,
      fu,
      prev_step,
      t1,
      cb,
      t2,
      // Actual tolerance
      tol_act,
      // Interpolation step is calculated in the form p/q; division
      // operations is delayed until the last moment
      p,
      q,
      // Step at this iteration
      new_step,
      eps = this.eps,
      maxiter = this.maxIterationsRoot,
      niter = 0,
      nfev = 0;

    if (Array.isArray(x0)) {
      if (x0.length < 2) {
        throw new Error('fzero: length of array x0 has to be at least two.');
      }

      a = x0[0];
      fa = f.call(object, a);
      nfev += 1;
      b = x0[1];
      fb = f.call(object, b);
      nfev += 1;
    } else {
      a = x0;
      fa = f.call(object, a);
      nfev += 1;

      // Try to get b.
      if (a === 0) {
        aa = 1;
      } else {
        aa = a;
      }

      blist = [
        0.9 * aa,
        1.1 * aa,
        aa - 1,
        aa + 1,
        0.5 * aa,
        1.5 * aa,
        -aa,
        2 * aa,
        -10 * aa,
        10 * aa,
      ];
      len = blist.length;

      for (i = 0; i < len; i++) {
        b = blist[i];
        fb = f.call(object, b);
        nfev += 1;

        if (fa * fb <= 0) {
          break;
        }
      }
      if (b < a) {
        u = a;
        a = b;
        b = u;

        fu = fa;
        fa = fb;
        fb = fu;
      }
    }

    if (fa * fb > 0) {
      // Bracketing not successful, fall back to Newton's method or to fminbr
      if (Array.isArray(x0)) {
        return this.fminbr(f, [a, b], object).x;
      }

      return this.Newton(f, a, object);
    }

    // OK, we have enclosed a zero of f.
    // Now we can start Brent's method

    c = a;
    fc = fa;

    // Main iteration loop
    while (niter < maxiter) {
      // Distance from the last but one to the last approximation
      prev_step = b - a;

      // Swap data for b to be the best approximation
      if (Math.abs(fc) < Math.abs(fb)) {
        a = b;
        b = c;
        c = a;

        fa = fb;
        fb = fc;
        fc = fa;
      }
      tol_act = 2 * eps * Math.abs(b) + eps * 0.5;
      new_step = (c - b) * 0.5;

      if (Math.abs(new_step) <= tol_act && Math.abs(fb) <= eps) {
        //  Acceptable approx. is found
        return b;
      }

      // Decide if the interpolation can be tried
      // If prev_step was large enough and was in true direction Interpolatiom may be tried
      if (Math.abs(prev_step) >= tol_act && Math.abs(fa) > Math.abs(fb)) {
        cb = c - b;

        // If we have only two distinct points linear interpolation can only be applied
        if (a === c) {
          t1 = fb / fa;
          p = cb * t1;
          q = 1.0 - t1;
          // Quadric inverse interpolation
        } else {
          q = fa / fc;
          t1 = fb / fc;
          t2 = fb / fa;

          p = t2 * (cb * q * (q - t1) - (b - a) * (t1 - 1.0));
          q = (q - 1.0) * (t1 - 1.0) * (t2 - 1.0);
        }

        // p was calculated with the opposite sign; make p positive
        if (p > 0) {
          q = -q;
          // and assign possible minus to q
        } else {
          p = -p;
        }

        // If b+p/q falls in [b,c] and isn't too large it is accepted
        // If p/q is too large then the bissection procedure can reduce [b,c] range to more extent
        if (
          p < 0.75 * cb * q - Math.abs(tol_act * q) * 0.5 &&
          p < Math.abs(prev_step * q * 0.5)
        ) {
          new_step = p / q;
        }
      }

      // Adjust the step to be not less than tolerance
      if (Math.abs(new_step) < tol_act) {
        if (new_step > 0) {
          new_step = tol_act;
        } else {
          new_step = -tol_act;
        }
      }

      // Save the previous approx.
      a = b;
      fa = fb;
      b += new_step;
      fb = f.call(object, b);
      // Do step to a new approxim.
      nfev += 1;

      // Adjust c for it to have a sign opposite to that of b
      if ((fb > 0 && fc > 0) || (fb < 0 && fc < 0)) {
        c = a;
        fc = fa;
      }
      niter++;
    } // End while

    return b;
  }

  /**
   *
   * Find minimum of an univariate function f.
   * <p>
   * Algorithm:
   *  G.Forsythe, M.Malcolm, C.Moler, Computer methods for mathematical
   *  computations. M., Mir, 1980, p.180 of the Russian edition
   *
   * @param {function} f Function, whose minimum is to be found
   * @param {Array} x0  Start interval enclosing the minimum
   * @param {Object} context Parent object in case f is method of it
   *
   * Return object with attributes:
   * - success: true if reached minimum before max number of iterations
   * - x: the approximation of the minimum value position
   * - fx: the value of f at x
   * - tol: the tolerance used in computing the minimum
   **/

  fminbr(f, x0, context) {
    var a,
      b,
      x,
      v,
      w,
      fx,
      fv,
      fw,
      range,
      middle_range,
      tol_act,
      new_step,
      p,
      q,
      t,
      ft,
      // Golden section ratio
      r = (3.0 - Math.sqrt(5.0)) * 0.5,
      tol = this.eps,
      sqrteps = this.eps, //Math.sqrt(Mat.eps),
      maxiter = this.maxIterationsMinimize,
      niter = 0,
      nfev = 0;

    if (!Array.isArray(x0) || x0.length < 2) {
      throw new Error(
        'Numerics.fminbr: length of array x0 has to be at least two.',
      );
    }

    a = x0[0];
    b = x0[1];
    v = a + r * (b - a);
    fv = f.call(context, v);
    if (Number.isNaN(fv)) {
      return { success: false };
    }

    // First step - always gold section
    nfev += 1;
    x = v;
    w = v;
    fx = fv;
    fw = fv;

    while (niter < maxiter) {
      // Range over the interval in which we are looking for the minimum
      range = b - a;
      middle_range = (a + b) * 0.5;

      // Actual tolerance
      tol_act = sqrteps * Math.abs(x) + tol / 3.0;

      if (Math.abs(x - middle_range) + range * 0.5 <= 2.0 * tol_act) {
        // Acceptable approx. is found
        return { success: true, x: x, fx: fx, tol: tol_act };
      }

      // Obtain the golden section step
      new_step = r * (x < middle_range ? b - x : a - x);

      // Decide if the interpolation can be tried. If x and w are distinct interpolatiom may be tried
      if (Math.abs(x - w) >= tol_act) {
        // Interpolation step is calculated as p/q;
        // division operation is delayed until last moment
        t = (x - w) * (fx - fv);
        q = (x - v) * (fx - fw);
        p = (x - v) * q - (x - w) * t;
        q = 2 * (q - t);

        if (q > 0) {
          // q was calculated with the op-
          p = -p; // posite sign; make q positive
        } else {
          // and assign possible minus to
          q = -q; // p
        }
        if (
          Math.abs(p) < Math.abs(new_step * q) && // If x+p/q falls in [a,b]
          p > q * (a - x + 2 * tol_act) && //  not too close to a and
          p < q * (b - x - 2 * tol_act)
        ) {
          // b, and isn't too large
          new_step = p / q; // it is accepted
        }
        // If p/q is too large then the
        // golden section procedure can
        // reduce [a,b] range to more
        // extent
      }

      // Adjust the step to be not less than tolerance
      if (Math.abs(new_step) < tol_act) {
        if (new_step > 0) {
          new_step = tol_act;
        } else {
          new_step = -tol_act;
        }
      }

      // Obtain the next approximation to min
      // and reduce the enveloping range

      // Tentative point for the min
      t = x + new_step;
      ft = f.call(context, t);
      if (Number.isNaN(ft)) {
        return { success: false };
      }
      nfev += 1;

      // t is a better approximation
      if (ft <= fx) {
        // Reduce the range so that t would fall within it
        if (t < x) {
          b = x;
        } else {
          a = x;
        }

        // Assign the best approx to x
        v = w;
        w = x;
        x = t;

        fv = fw;
        fw = fx;
        fx = ft;
        // x remains the better approx
      } else {
        // Reduce the range enclosing x
        if (t < x) {
          a = t;
        } else {
          b = t;
        }

        if (ft <= fw || w === x) {
          v = w;
          w = t;
          fv = fw;
          fw = ft;
        } else if (ft <= fv || v === x || v === w) {
          v = t;
          fv = ft;
        }
      }
      niter += 1;
    }

    return { success: false, x: x, fx: fx };
  }

  /**
   * Newton's method to find roots of a funtion in one variable.
   * @param {function} f We search for a solution of f(x)=0.
   * @param {Number} x initial guess for the root, i.e. start value.
   * @param {Object} context optional object that is treated as "this" in the function body. This is useful if
   * the function is a method of an object and contains a reference to its parent object via "this".
   * @returns {Number} A root of the function f.
   */
  Newton(f, x, context) {
    var df,
      i = 0,
      h = this.eps,
      newf = f.apply(context, [x]),
      nfev = 1;

    // For compatibility
    if (Array.isArray(x)) {
      x = x[0];
    }

    while (i < 50 && Math.abs(newf) > h) {
      df = this.D(f, context)(x);
      nfev += 2;

      if (Math.abs(df) > h) {
        x -= newf / df;
      } else {
        x += Math.random() * 0.2 - 1.0;
      }

      newf = f.apply(context, [x]);
      nfev += 1;
      i += 1;
    }

    return x;
  }

  /**
   * Numerical (symmetric) approximation of derivative.
   * @param {function} f Function in one variable to be differentiated.
   * @param {object} [obj] Optional object that is treated as "this" in the function body. This is useful, if the function is a
   * method of an object and contains a reference to its parent object via "this".
   * @returns {function} Derivative function of a given function f.
   */
  D(f, obj) {
    if (!(obj === undefined || obj === null)) {
      return function (x) {
        var h = 0.00001,
          h2 = h * 2.0;
        return (f(x + h) - f(x - h)) / h2;
      };
    }

    return function (x) {
      var h = 0.00001,
        h2 = h * 2.0;

      return (f.apply(obj, [x + h]) - f.apply(obj, [x - h])) / h2;
    };
  }
}
