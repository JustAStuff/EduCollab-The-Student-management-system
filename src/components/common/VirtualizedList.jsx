// src/components/common/VirtualizedList.jsx - Virtualized list for large datasets
import { useState, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';

const VirtualizedList = ({
  items,
  itemHeight,
  containerHeight = 400,
  renderItem,
  overscan = 5,
  onScroll = null
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const visibleRange = useMemo(() => {
    const containerScrollTop = scrollTop;
    const startIndex = Math.max(0, Math.floor(containerScrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((containerScrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  const handleScroll = (event) => {
    const newScrollTop = event.target.scrollTop;
    setScrollTop(newScrollTop);
    
    if (onScroll) {
      onScroll(event);
    }
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      {/* Total height spacer */}
      <Box sx={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <Box
          sx={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <Box
              key={visibleRange.startIndex + index}
              sx={{ height: itemHeight }}
            >
              {renderItem(item, visibleRange.startIndex + index)}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

VirtualizedList.propTypes = {
  items: PropTypes.array.isRequired,
  itemHeight: PropTypes.number.isRequired,
  containerHeight: PropTypes.number,
  renderItem: PropTypes.func.isRequired,
  overscan: PropTypes.number,
  onScroll: PropTypes.func
};

export default VirtualizedList;