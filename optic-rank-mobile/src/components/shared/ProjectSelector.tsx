import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";
import Card from "../ui/Card";
import {
  useActiveProject,
  useProjects,
  useSwitchProject,
} from "../../hooks/useProjects";

export default function ProjectSelector() {
  const { colors } = useTheme();
  const { data: project } = useActiveProject();
  const { data: projects = [] } = useProjects();
  const switchProject = useSwitchProject();
  const [open, setOpen] = useState(false);

  if (!project) return null;

  const handleSelect = (projectId: string) => {
    if (projectId === project.id) {
      setOpen(false);
      return;
    }
    switchProject.mutate(projectId);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setOpen(true)}>
        <Card variant="sm" style={styles.card}>
          <View style={styles.left}>
            <Text
              style={[styles.name, { color: colors.ink }]}
              numberOfLines={1}
            >
              {project.name}
            </Text>
            <Text
              style={[styles.domain, { color: colors.inkMuted }]}
              numberOfLines={1}
            >
              {project.domain ?? project.url ?? "No domain"}
            </Text>
          </View>
          <Feather
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.inkMuted}
          />
        </Card>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.dropdownTitle, { color: colors.red }]}>
              SELECT PROJECT
            </Text>

            <FlatList
              data={projects}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isActive = item.id === project.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: isActive
                          ? colors.surfaceInset
                          : "transparent",
                      },
                    ]}
                    onPress={() => handleSelect(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionLeft}>
                      <Text
                        style={[
                          styles.optionName,
                          { color: colors.ink },
                          isActive && { color: colors.red },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[styles.optionDomain, { color: colors.inkMuted }]}
                        numberOfLines={1}
                      >
                        {item.domain ?? item.url ?? "No domain"}
                      </Text>
                    </View>
                    {isActive && (
                      <Feather name="check" size={16} color={colors.red} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.inkMuted }]}>
                  No projects found
                </Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  left: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
  },
  domain: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  dropdown: {
    borderWidth: 1,
    maxHeight: 360,
    paddingVertical: 12,
  },
  dropdownTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flex: 1,
    marginRight: 8,
  },
  optionName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
  },
  optionDomain: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 1,
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    textAlign: "center",
    paddingVertical: 24,
  },
});
