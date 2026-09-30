"""Derived, distance-smoothed curve banking. No Blender state or authored cache."""
import bisect
import math


def smoother(value):
    t = max(0., min(1., value))
    return t*t*t*(t*(6*t-15)+10)


def profile_from_rail(points, max_lean=24., distance=12., hold=.97, count=513):
    """Points contain world-space (co, left handle, right handle).

    Blender's rail advances by arc distance. Heading is measured in its XY
    ground plane: a right curve has positive heading and clockwise camera lean.
    Look across a distance window, then average locally to soften Bezier joins.
    """
    path = []
    for a, b in zip(points, points[1:]):
        for step in range(64):
            t = step/64; u = 1-t
            path.append(tuple(u**3*a[0][i]+3*u*u*t*a[2][i]+3*u*t*t*b[1][i]+t**3*b[0][i] for i in range(3)))
    path.append(tuple(points[-1][0]))
    lengths = [0.]
    for a, b in zip(path, path[1:]):
        lengths.append(lengths[-1]+math.dist(a, b))
    total = lengths[-1]
    if total < 1e-6: raise ValueError('FlightRail needs a non-zero length.')

    headings = []
    for i in range(len(path)):
        a, b = path[max(0, i-1)], path[min(len(path)-1, i+1)]
        angle = math.atan2(b[0]-a[0], b[1]-a[1]) if math.hypot(b[0]-a[0], b[1]-a[1]) > 1e-8 else (headings[-1] if headings else 0.)
        if headings: angle = headings[-1]+(angle-headings[-1]+math.pi)%math.tau-math.pi
        headings.append(angle)

    def heading(at):
        at = max(0., min(total, at))
        i = max(0, min(len(lengths)-2, bisect.bisect_right(lengths, at)-1))
        t = (at-lengths[i])/max(1e-9, lengths[i+1]-lengths[i])
        return headings[i]+(headings[i+1]-headings[i])*t

    values = []
    for i in range(count):
        p = i/(count-1); at = min(1., p/hold)*total
        bend = sum((heading(at+offset*distance/8+distance/2)-heading(at+offset*distance/8-distance/2))
                   for offset in (-2, -1, 0, 1, 2))/5
        lean = max_lean*math.tanh(math.degrees(bend)*3/max(max_lean, 1e-6))
        lean *= smoother(p/.06)*smoother((hold-p)/.06)
        values.append(lean)
    # Shape-preserving Hermite tangents keep every interpolated angle within
    # the same safe range; the browser uses this identical scalar profile.
    slopes = [0.]*count
    for i in range(1, count-1):
        left = (values[i]-values[i-1])*(count-1)
        right = (values[i+1]-values[i])*(count-1)
        if left*right > 0: slopes[i] = 2*left*right/(left+right)
    return [[i/(count-1), values[i], slopes[i]] for i in range(count)]


def sample_profile(samples, progress):
    if not samples: return 0.
    # Profiles are uniformly sampled; no search or allocation during playback.
    scaled = max(0., min(1., progress))*(len(samples)-1)
    i = min(len(samples)-2, int(scaled)); t = scaled-i
    a, b = samples[i], samples[i+1]; width = b[0]-a[0]
    return ((2*t**3-3*t*t+1)*a[1]+(t**3-2*t*t+t)*width*a[2]
            +(-2*t**3+3*t*t)*b[1]+(t**3-t*t)*width*b[2])
