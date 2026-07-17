import React, { useMemo, useState } from 'react';
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { GRAPH_NODES, GraphNode, GraphNodeKind, neighborsOf } from '../data/graph';
import { font, Palette, radius, space, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

const QUIET_EASE = LayoutAnimation.create(
  240,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

const KIND_LABEL: Record<GraphNodeKind, string> = {
  startup: 'Startup',
  university: 'University',
  founder: 'Founder',
  topic: 'Topic',
  paper: 'Paper',
  patent: 'Patent',
  lab: 'Competing lab',
};

interface Props {
  onClose: () => void;
}

/**
 * Deep-tech knowledge graph — an ego-graph browser. The focused node sits at
 * the center; its neighbors ring it, colored by kind. Tap any neighbor to
 * refocus and walk the graph: startup → topic → who else works on it.
 */
export function KnowledgeGraphScreen({ onClose }: Props) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const [focusId, setFocusId] = useState('t:hts'); // "rare-earth-free magnets"
  const [size, setSize] = useState(0);

  const focus = GRAPH_NODES.find((n) => n.id === focusId)!;
  const neighbors = useMemo(() => neighborsOf(focusId), [focusId]);

  const kindColor = (kind: GraphNodeKind): string => {
    const cats = palette.chartCategorical;
    switch (kind) {
      case 'startup':
        return cats[3]; // emerald family
      case 'university':
        return cats[0]; // blue
      case 'founder':
        return cats[2]; // plum
      case 'topic':
        return palette.bronze;
      case 'paper':
      case 'patent':
        return cats[1]; // goldenrod
      case 'lab':
        return palette.danger;
    }
  };

  const refocus = (id: string) => {
    LayoutAnimation.configureNext(QUIET_EASE);
    setFocusId(id);
  };

  // Radial layout
  const cx = size / 2;
  const cy = size / 2;
  const ringR = size * 0.36;
  const positioned = neighbors.map((n, i) => {
    const angle = (2 * Math.PI * i) / neighbors.length - Math.PI / 2;
    return {
      ...n,
      x: cx + ringR * Math.cos(angle),
      y: cy + ringR * Math.sin(angle),
    };
  });

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to discovery feed">
          <Text style={s.back}>← Discovery</Text>
        </Pressable>
        <Text style={s.title}>Knowledge Graph</Text>
        <Text style={s.subtitle}>
          Startups · founders · papers · patents · topics · labs — tap a node to walk the graph
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.focusKind}>{KIND_LABEL[focus.kind].toUpperCase()}</Text>
          <Text style={s.focusLabel}>{focus.label}</Text>
          <Text style={s.focusMeta}>
            {neighbors.length} connection{neighbors.length === 1 ? '' : 's'}
          </Text>

          <View style={s.graphWrap} onLayout={(e) => setSize(e.nativeEvent.layout.width)}>
            {size > 0 && (
              <Svg width={size} height={size}>
                {positioned.map((n) => (
                  <Line
                    key={`edge-${n.node.id}`}
                    x1={cx}
                    y1={cy}
                    x2={n.x}
                    y2={n.y}
                    stroke={palette.hairline}
                    strokeWidth={1.2}
                  />
                ))}
                {positioned.map((n) => (
                  <React.Fragment key={n.node.id}>
                    <Circle cx={n.x} cy={n.y} r={13} fill={kindColor(n.node.kind)} />
                    <SvgText
                      x={n.x}
                      y={n.y + 27}
                      fontSize={9}
                      fill={palette.inkMuted}
                      textAnchor="middle"
                      fontFamily={font.sans}
                    >
                      {truncate(n.node.label, 20)}
                    </SvgText>
                  </React.Fragment>
                ))}
                {/* Focus node on top */}
                <Circle cx={cx} cy={cy} r={20} fill={palette.navy} stroke={palette.gold} strokeWidth={2} />
              </Svg>
            )}
            {/* Tap targets over the SVG */}
            {size > 0 &&
              positioned.map((n) => (
                <Pressable
                  key={`tap-${n.node.id}`}
                  onPress={() => refocus(n.node.id)}
                  style={[s.tapTarget, { left: n.x - 24, top: n.y - 24 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Focus ${n.node.label}`}
                />
              ))}
          </View>

          <View style={s.legend}>
            {(Object.keys(KIND_LABEL) as GraphNodeKind[]).map((kind) => (
              <View key={kind} style={s.legendItem}>
                <View style={[s.swatch, { backgroundColor: kindColor(kind) }]} />
                <Text style={s.legendText}>{KIND_LABEL[kind]}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.connOverline}>Connections</Text>
          {neighbors.map((n) => (
            <Pressable
              key={n.node.id}
              style={s.connRow}
              onPress={() => refocus(n.node.id)}
              accessibilityRole="button"
            >
              <View style={[s.swatch, { backgroundColor: kindColor(n.node.kind) }]} />
              <View style={s.connBody}>
                <Text style={s.connLabel}>{n.node.label}</Text>
                <Text style={s.connEdge}>
                  {n.edge} · {KIND_LABEL[n.node.kind]}
                </Text>
              </View>
              <Text style={s.connArrow}>→</Text>
            </Pressable>
          ))}
          <Text style={s.footnote}>
            Try: a topic node shows every startup and competing lab working on it. Production
            builds this graph from data rooms, publication APIs, and the science agent.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + '…';
}

const makeStyles = (c: Palette) => {
  const T = typeStyles(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: {
      backgroundColor: c.navy,
      paddingTop: space.xxl + space.sm,
      paddingHorizontal: space.lg,
      paddingBottom: space.lg,
    },
    back: { fontFamily: font.sans, fontSize: 13, color: c.onNavyMuted, marginBottom: space.md },
    title: { fontFamily: font.serif, fontSize: 26, lineHeight: 34, color: c.onNavy },
    subtitle: { fontFamily: font.sans, fontSize: 12, lineHeight: 18, color: c.onNavyMuted, marginTop: space.xs },

    content: { padding: space.md, paddingBottom: space.xxl },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
      marginBottom: space.md,
    },
    focusKind: { ...T.overline, color: c.bronze },
    focusLabel: { fontFamily: font.serif, fontSize: 21, color: c.ink, marginTop: 2 },
    focusMeta: { ...T.caption, fontSize: 11, marginTop: 2 },

    graphWrap: { width: '100%', alignItems: 'center', marginTop: space.sm },
    tapTarget: { position: 'absolute', width: 48, height: 48 },

    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingTop: space.sm,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: space.md, marginTop: 4 },
    swatch: { width: 9, height: 9, borderRadius: 4.5, marginRight: 5 },
    legendText: { fontFamily: font.sans, fontSize: 10, color: c.inkMuted },

    connOverline: { ...T.overline, marginBottom: space.xs },
    connRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingVertical: space.sm + 2,
    },
    connBody: { flex: 1, marginLeft: space.sm },
    connLabel: { ...T.body, fontSize: 14, fontWeight: '600' },
    connEdge: { fontFamily: font.sans, fontSize: 11, color: c.inkMuted, marginTop: 1 },
    connArrow: { fontFamily: font.serif, fontSize: 16, color: c.inkFaint },
    footnote: { ...T.caption, fontSize: 10, lineHeight: 15, marginTop: space.md },
  });
};
